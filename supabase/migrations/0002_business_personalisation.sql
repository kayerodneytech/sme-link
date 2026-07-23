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
  add column tracks_inventory boolean not null default true,
  add column currencies char(3)[];

update public.businesses
set currencies = array[currency]::char(3)[];

alter table public.businesses
  alter column currencies set default array['USD']::char(3)[],
  alter column currencies set not null,
  add constraint businesses_currencies_not_empty_check
  check (cardinality(currencies) > 0),
  add constraint businesses_primary_currency_enabled_check
  check (currency = any(currencies));

-- Account and workspace creation happen in the same auth transaction. If any
-- required onboarding value or business insert fails, the auth user is rolled back.
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
begin
  if nullif(trim(metadata ->> 'full_name'), '') is null
    or nullif(trim(metadata ->> 'business_name'), '') is null
    or nullif(trim(metadata ->> 'business_sector'), '') is null
  then
    raise exception 'Complete all required onboarding details';
  end if;

  select array_agg(value)
  into selected_needs
  from jsonb_array_elements_text(metadata -> 'business_needs') as value;

  if coalesce(cardinality(selected_needs), 0) = 0 then
    raise exception 'Choose at least one area for the business';
  end if;

  primary_currency := upper(coalesce(nullif(metadata ->> 'business_currency', ''), 'USD'));

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
    coalesce((metadata ->> 'business_tracks_inventory')::boolean, true),
    new.id
  )
  returning id into new_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (new_business_id, new.id, 'owner');

  foreach category_name in array array[
    'Stock purchases', 'Transport', 'Utilities', 'Rent', 'Supplies', 'Other'
  ]
  loop
    insert into public.expense_categories (business_id, name, is_system)
    values (new_business_id, category_name, true);
  end loop;

  return new;
end;
$$;

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
  business_tracks_inventory boolean default true,
  business_currencies text[] default array['USD']::text[]
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
    currencies,
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
    array(
      select distinct upper(value)::char(3)
      from unnest(array_append(business_currencies, business_currency)) as value
    ),
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
  text, text, text, text, text, text, text, text[], boolean, text[]
) from public;
grant execute on function public.create_business(
  text, text, text, text, text, text, text, text[], boolean, text[]
) to authenticated;

commit;
