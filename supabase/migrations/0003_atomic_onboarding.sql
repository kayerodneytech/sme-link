-- Create the auth account and its business workspace as one transaction.
-- Apply after 0002_business_personalisation.sql.

begin;

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

commit;
