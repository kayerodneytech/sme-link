-- Add business personalisation fields used by the onboarding flow.
-- Apply after 0001_initial_schema.sql. This migration does not insert data.

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

commit;
