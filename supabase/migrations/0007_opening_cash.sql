-- Starting cash (capital / cash in hand) for every business.
-- Apply after 0006_product_size.sql.
--
-- Cash on hand ≈ opening_cash + completed sales - all recorded expenses.
-- Buying stock with money creates a "Stock purchases" expense (inventory
-- businesses only). Profit reports still use cost of goods for sold stock,
-- and ignore Stock purchases in that profit figure so money is not counted twice.

begin;

alter table public.businesses
  add column if not exists opening_cash numeric(14, 2) not null default 0
    check (opening_cash >= 0);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  new_business_id uuid;
  category_name text;
  selected_needs text[];
  selected_currencies char(3)[];
  primary_currency char(3);
  tracks_inventory boolean;
  opening_cash numeric(14, 2);
  expense_names text[];
begin
  if nullif(trim(metadata ->> 'full_name'), '') is null
    or nullif(trim(metadata ->> 'business_name'), '') is null
    or nullif(trim(metadata ->> 'business_sector'), '') is null
  then
    raise exception 'Complete all required onboarding details';
  end if;

  opening_cash := coalesce((metadata ->> 'business_opening_cash')::numeric, -1);
  if opening_cash < 0 then
    raise exception 'Enter the starting money / cash in hand for the business';
  end if;

  select array_agg(value)
  into selected_needs
  from jsonb_array_elements_text(metadata -> 'business_needs') as value;

  if coalesce(cardinality(selected_needs), 0) = 0 then
    raise exception 'Choose at least one area for the business';
  end if;

  primary_currency := upper(
    coalesce(nullif(metadata ->> 'business_currency', ''), 'USD')
  );

  select array_agg(distinct upper(value)::char(3))
  into selected_currencies
  from jsonb_array_elements_text(metadata -> 'business_currencies') as value;

  selected_currencies := array(
    select distinct value
    from unnest(array_append(
      coalesce(selected_currencies, array[]::char(3)[]),
      primary_currency
    )) as value
  );

  tracks_inventory := coalesce(
    (metadata ->> 'business_tracks_inventory')::boolean,
    true
  );

  insert into public.profiles (id, full_name)
  values (new.id, trim(metadata ->> 'full_name'));

  insert into public.businesses (
    name,
    sector,
    phone,
    location,
    currency,
    currencies,
    team_size,
    sales_mode,
    primary_needs,
    tracks_inventory,
    opening_cash,
    created_by
  )
  values (
    trim(metadata ->> 'business_name'),
    metadata ->> 'business_sector',
    nullif(trim(metadata ->> 'business_phone'), ''),
    nullif(trim(metadata ->> 'business_location'), ''),
    primary_currency,
    selected_currencies,
    coalesce(nullif(metadata ->> 'business_team_size', ''), 'just_me'),
    coalesce(nullif(metadata ->> 'business_sales_mode', ''), 'walk_in'),
    selected_needs,
    tracks_inventory,
    opening_cash,
    new.id
  )
  returning id into new_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (new_business_id, new.id, 'owner');

  if tracks_inventory then
    expense_names := array[
      'Stock purchases', 'Transport', 'Utilities', 'Rent', 'Supplies', 'Other'
    ];
  else
    expense_names := array[
      'Transport', 'Utilities', 'Rent', 'Supplies', 'Other'
    ];
  end if;

  foreach category_name in array expense_names
  loop
    insert into public.expense_categories (business_id, name, is_system)
    values (new_business_id, category_name, true);
  end loop;

  return new;
end;
$$;

revoke all on function public.create_business(
  text, text, text, text, text, text, text, text[], boolean, text[]
) from public;
drop function if exists public.create_business(
  text, text, text, text, text, text, text, text[], boolean, text[]
);

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
  business_tracks_inventory boolean default true,
  business_currencies text[] default array['USD']::text[],
  business_opening_cash numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_business_id uuid;
  category_name text;
  expense_names text[];
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if business_opening_cash is null or business_opening_cash < 0 then
    raise exception 'Enter the starting money / cash in hand for the business';
  end if;

  insert into public.businesses (
    name,
    sector,
    phone,
    location,
    currency,
    currencies,
    team_size,
    sales_mode,
    primary_needs,
    tracks_inventory,
    opening_cash,
    created_by
  )
  values (
    trim(business_name),
    business_sector,
    nullif(trim(business_phone), ''),
    nullif(trim(business_location), ''),
    upper(business_currency),
    array(
      select distinct upper(value)::char(3)
      from unnest(array_append(business_currencies, business_currency)) as value
    ),
    business_team_size,
    business_sales_mode,
    business_needs,
    business_tracks_inventory,
    business_opening_cash,
    auth.uid()
  )
  returning id into new_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (new_business_id, auth.uid(), 'owner');

  if business_tracks_inventory then
    expense_names := array[
      'Stock purchases', 'Transport', 'Utilities', 'Rent', 'Supplies', 'Other'
    ];
  else
    expense_names := array[
      'Transport', 'Utilities', 'Rent', 'Supplies', 'Other'
    ];
  end if;

  foreach category_name in array expense_names
  loop
    insert into public.expense_categories (business_id, name, is_system)
    values (new_business_id, category_name, true);
  end loop;

  return new_business_id;
end;
$$;

revoke all on function public.create_business(
  text, text, text, text, text, text, text, text[], boolean, text[], numeric
) from public;
grant execute on function public.create_business(
  text, text, text, text, text, text, text, text[], boolean, text[], numeric
) to authenticated;

commit;
