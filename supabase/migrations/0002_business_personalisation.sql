-- Business personalisation, flexible products and low-stock alerts.
-- Apply after 0001_initial_schema.sql. This migration does not insert seed data.

begin;

alter table public.businesses
  drop constraint businesses_sector_check;

alter table public.businesses
  add constraint businesses_sector_check
  check (sector in (
    'retail', 'wholesale', 'services', 'manufacturing', 'hospitality', 'other'
  )),
  add column team_size text not null default 'just_me'
    check (team_size in ('just_me', '2_5', '6_20', 'more_than_20')),
  add column sales_mode text not null default 'walk_in'
    check (sales_mode in ('walk_in', 'orders', 'both')),
  add column primary_needs text[] not null
    default array['sales', 'inventory', 'expenses', 'reports']::text[]
    check (
      primary_needs <@ array[
        'sales', 'inventory', 'orders', 'expenses', 'customers', 'reports'
      ]::text[]
    ),
  add column tracks_inventory boolean not null default true;

alter table public.products
  add column barcode text,
  add column product_type text not null default 'stocked'
    check (product_type in ('stocked', 'service')),
  add column unit text not null default 'item'
    check (char_length(unit) between 1 and 30),
  add column pack_size numeric(12, 3) not null default 1
    check (pack_size > 0),
  add column cost_price numeric(14, 2) not null default 0
    check (cost_price >= 0);

create unique index products_business_barcode_idx
  on public.products(business_id, barcode)
  where barcode is not null;

create unique index notifications_one_open_entity_idx
  on public.notifications(business_id, notification_type, entity_type, entity_id)
  where read_at is null and entity_id is not null;

revoke all on function public.create_business(text, text, text, text, text)
  from public;
drop function public.create_business(text, text, text, text, text);

create function public.create_business(
  business_name text,
  business_sector text,
  business_phone text default null,
  business_location text default null,
  business_currency text default 'USD',
  business_team_size text default 'just_me',
  business_sales_mode text default 'walk_in',
  business_needs text[] default array[
    'sales', 'inventory', 'expenses', 'reports'
  ]::text[],
  business_tracks_inventory boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_business_id uuid;
  category_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.businesses (
    name,
    sector,
    phone,
    location,
    currency,
    team_size,
    sales_mode,
    primary_needs,
    tracks_inventory,
    created_by
  )
  values (
    trim(business_name),
    business_sector,
    nullif(trim(business_phone), ''),
    nullif(trim(business_location), ''),
    upper(business_currency),
    business_team_size,
    business_sales_mode,
    business_needs,
    business_tracks_inventory,
    auth.uid()
  )
  returning id into new_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (new_business_id, auth.uid(), 'owner');

  foreach category_name in array array[
    'Stock purchases', 'Transport', 'Utilities', 'Rent', 'Supplies', 'Other'
  ]
  loop
    insert into public.expense_categories (business_id, name, is_system)
    values (new_business_id, category_name, true);
  end loop;

  return new_business_id;
end;
$$;

revoke all on function public.create_business(
  text, text, text, text, text, text, text, text[], boolean
) from public;
grant execute on function public.create_business(
  text, text, text, text, text, text, text, text[], boolean
) to authenticated;

create or replace view public.product_stock
with (security_invoker = true)
as
select
  p.id,
  p.business_id,
  p.name,
  p.sku,
  p.category,
  p.selling_price,
  p.reorder_level,
  p.is_archived,
  coalesce(sum(m.quantity_change), 0)::numeric(12, 3) as quantity_on_hand,
  p.barcode,
  p.product_type,
  p.unit,
  p.pack_size,
  p.cost_price
from public.products p
left join public.inventory_movements m on m.product_id = p.id
group by p.id;

create or replace function public.complete_sale(target_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_sale public.sales%rowtype;
  item record;
  calculated_total numeric(14, 2);
  available_stock numeric(12, 3);
begin
  select * into target_sale
  from public.sales
  where id = target_sale_id
  for update;

  if target_sale.id is null
    or not public.is_business_member(target_sale.business_id)
  then
    raise exception 'Sale not found';
  end if;

  if target_sale.status <> 'draft' then
    raise exception 'Only a draft sale can be completed';
  end if;

  if not exists (
    select 1 from public.sale_items where sale_id = target_sale_id
  ) then
    raise exception 'A sale must contain at least one item';
  end if;

  for item in
    select
      si.product_id,
      si.quantity,
      p.business_id,
      p.name,
      p.product_type
    from public.sale_items si
    join public.products p on p.id = si.product_id
    where si.sale_id = target_sale_id
    for update of p
  loop
    if item.business_id <> target_sale.business_id then
      raise exception 'A sale item belongs to another business';
    end if;

    if item.product_type = 'stocked' then
      select coalesce(sum(quantity_change), 0)
      into available_stock
      from public.inventory_movements
      where product_id = item.product_id;

      if available_stock < item.quantity then
        raise exception 'Not enough stock for %', item.name;
      end if;
    end if;
  end loop;

  select round(sum(line_total), 2)
  into calculated_total
  from public.sale_items
  where sale_id = target_sale_id;

  insert into public.inventory_movements (
    business_id,
    product_id,
    sale_id,
    movement_type,
    quantity_change,
    note,
    created_by
  )
  select
    target_sale.business_id,
    si.product_id,
    target_sale_id,
    'sale',
    -si.quantity,
    'Completed sale',
    auth.uid()
  from public.sale_items si
  join public.products p on p.id = si.product_id
  where si.sale_id = target_sale_id
    and p.product_type = 'stocked';

  update public.sales
  set
    subtotal = calculated_total,
    total = calculated_total,
    status = 'completed',
    completed_at = now()
  where id = target_sale_id;
end;
$$;

create function public.update_low_stock_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_record public.products%rowtype;
  stock_on_hand numeric(12, 3);
begin
  select * into product_record
  from public.products
  where id = new.product_id;

  if product_record.product_type <> 'stocked' then
    return new;
  end if;

  select coalesce(sum(quantity_change), 0)
  into stock_on_hand
  from public.inventory_movements
  where product_id = new.product_id;

  if stock_on_hand <= product_record.reorder_level then
    insert into public.notifications (
      business_id,
      notification_type,
      title,
      message,
      entity_type,
      entity_id
    )
    values (
      product_record.business_id,
      'low_stock',
      'Low stock: ' || product_record.name,
      stock_on_hand || ' ' || product_record.unit ||
        ' remaining. Your restock level is ' ||
        product_record.reorder_level || '.',
      'product',
      product_record.id
    )
    on conflict (business_id, notification_type, entity_type, entity_id)
      where read_at is null and entity_id is not null
    do update set
      title = excluded.title,
      message = excluded.message,
      created_at = now();
  else
    update public.notifications
    set read_at = now()
    where business_id = product_record.business_id
      and notification_type = 'low_stock'
      and entity_type = 'product'
      and entity_id = product_record.id
      and read_at is null;
  end if;

  return new;
end;
$$;

create trigger inventory_update_low_stock_notification
after insert on public.inventory_movements
for each row execute function public.update_low_stock_notification();

commit;
