-- Repair missing business columns and add per-currency cash accounts.
-- Safe to run even if earlier migrations were skipped or partially applied.

begin;

-- ---------- Repair businesses columns (from 0002 / 0004 / 0007) ----------

alter table public.businesses drop constraint if exists businesses_sector_check;
alter table public.businesses
  add constraint businesses_sector_check
  check (sector in (
    'retail', 'wholesale', 'services', 'manufacturing', 'hospitality', 'other'
  ));

alter table public.businesses
  add column if not exists team_size text not null default 'just_me';
alter table public.businesses drop constraint if exists businesses_team_size_check;
alter table public.businesses
  add constraint businesses_team_size_check
  check (team_size in ('just_me', '2_5', '6_20', 'more_than_20'));

alter table public.businesses
  add column if not exists sales_mode text not null default 'walk_in';
alter table public.businesses drop constraint if exists businesses_sales_mode_check;
alter table public.businesses
  add constraint businesses_sales_mode_check
  check (sales_mode in ('walk_in', 'orders', 'both'));

alter table public.businesses
  add column if not exists primary_needs text[] not null
    default array['sales', 'inventory', 'expenses', 'reports']::text[];
alter table public.businesses drop constraint if exists businesses_primary_needs_check;
alter table public.businesses
  add constraint businesses_primary_needs_check
  check (
    primary_needs <@ array[
      'sales', 'inventory', 'orders', 'expenses', 'customers', 'reports'
    ]::text[]
  );

alter table public.businesses
  add column if not exists tracks_inventory boolean not null default true;

alter table public.businesses
  add column if not exists currencies char(3)[];

update public.businesses
set currencies = array[currency]::char(3)[]
where currencies is null;

alter table public.businesses
  alter column currencies set default array['USD']::char(3)[],
  alter column currencies set not null;

alter table public.businesses drop constraint if exists businesses_currencies_not_empty_check;
alter table public.businesses
  add constraint businesses_currencies_not_empty_check
  check (cardinality(currencies) > 0);

alter table public.businesses drop constraint if exists businesses_primary_currency_enabled_check;
alter table public.businesses
  add constraint businesses_primary_currency_enabled_check
  check (currency = any(currencies));

alter table public.businesses
  add column if not exists vat_registered boolean not null default false,
  add column if not exists vat_rate numeric(5, 2) not null default 15;

alter table public.businesses drop constraint if exists businesses_vat_rate_check;
alter table public.businesses
  add constraint businesses_vat_rate_check
  check (vat_rate >= 0 and vat_rate <= 100);

alter table public.businesses
  add column if not exists opening_cash numeric(14, 2) not null default 0;
alter table public.businesses drop constraint if exists businesses_opening_cash_check;
alter table public.businesses
  add constraint businesses_opening_cash_check
  check (opening_cash >= 0);

-- ---------- Per-currency cash accounts ----------

create table if not exists public.business_cash_accounts (
  business_id uuid not null references public.businesses(id) on delete cascade,
  currency char(3) not null check (currency in ('USD', 'ZIG', 'ZAR')),
  opening_balance numeric(14, 2) not null default 0 check (opening_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, currency)
);

create index if not exists business_cash_accounts_business_id_idx
  on public.business_cash_accounts(business_id);

alter table public.business_cash_accounts enable row level security;

drop policy if exists "cash_accounts_member_select" on public.business_cash_accounts;
drop policy if exists "cash_accounts_owner_write" on public.business_cash_accounts;

create policy "cash_accounts_member_select" on public.business_cash_accounts
for select using (public.is_business_member(business_id));

create policy "cash_accounts_owner_write" on public.business_cash_accounts
for all using (public.is_business_owner(business_id))
with check (public.is_business_owner(business_id));

-- Seed cash accounts from current currencies / opening_cash
insert into public.business_cash_accounts (business_id, currency, opening_balance)
select
  b.id,
  c.currency,
  case
    when c.currency = b.currency then b.opening_cash
    else 0
  end
from public.businesses b
cross join lateral unnest(b.currencies) as c(currency)
on conflict (business_id, currency) do nothing;

-- ---------- Currency on sales and expenses ----------

alter table public.sales
  add column if not exists currency char(3);

update public.sales s
set currency = b.currency
from public.businesses b
where s.business_id = b.id
  and s.currency is null;

alter table public.sales
  alter column currency set default 'USD',
  alter column currency set not null;

alter table public.sales drop constraint if exists sales_currency_check;
alter table public.sales
  add constraint sales_currency_check
  check (currency in ('USD', 'ZIG', 'ZAR'));

alter table public.expenses
  add column if not exists currency char(3);

update public.expenses e
set currency = b.currency
from public.businesses b
where e.business_id = b.id
  and e.currency is null;

alter table public.expenses
  alter column currency set default 'USD',
  alter column currency set not null;

alter table public.expenses drop constraint if exists expenses_currency_check;
alter table public.expenses
  add constraint expenses_currency_check
  check (currency in ('USD', 'ZIG', 'ZAR'));

-- ---------- Auth / create_business with per-currency openings ----------

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
  currency_code char(3);
  opening_for_currency numeric(14, 2);
  openings jsonb;
begin
  if nullif(trim(metadata ->> 'full_name'), '') is null
    or nullif(trim(metadata ->> 'business_name'), '') is null
    or nullif(trim(metadata ->> 'business_sector'), '') is null
  then
    raise exception 'Complete all required onboarding details';
  end if;

  opening_cash := coalesce((metadata ->> 'business_opening_cash')::numeric, 0);
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
  openings := coalesce(metadata -> 'business_cash_openings', '{}'::jsonb);

  insert into public.profiles (id, full_name)
  values (new.id, trim(metadata ->> 'full_name'));

  insert into public.businesses (
    name, sector, phone, location, currency, currencies,
    team_size, sales_mode, primary_needs, tracks_inventory,
    opening_cash, created_by
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

  foreach currency_code in array selected_currencies
  loop
    opening_for_currency := coalesce(
      nullif(openings ->> currency_code, '')::numeric,
      case when currency_code = primary_currency then opening_cash else 0 end
    );
    if opening_for_currency < 0 then
      opening_for_currency := 0;
    end if;

    insert into public.business_cash_accounts (
      business_id, currency, opening_balance
    )
    values (new_business_id, currency_code, opening_for_currency);
  end loop;

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

drop function if exists public.create_business(text, text, text, text, text);
drop function if exists public.create_business(
  text, text, text, text, text, text, text, text[], boolean, text[]
);
drop function if exists public.create_business(
  text, text, text, text, text, text, text, text[], boolean, text[], numeric
);
drop function if exists public.create_business(
  text, text, text, text, text, text, text, text[], boolean, text[], numeric, jsonb
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
  business_opening_cash numeric default 0,
  business_cash_openings jsonb default '{}'::jsonb
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
  selected_currencies char(3)[];
  primary_currency char(3);
  currency_code char(3);
  opening_for_currency numeric(14, 2);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if business_opening_cash is null or business_opening_cash < 0 then
    raise exception 'Enter the starting money / cash in hand for the business';
  end if;

  primary_currency := upper(coalesce(nullif(business_currency, ''), 'USD'));
  selected_currencies := array(
    select distinct upper(value)::char(3)
    from unnest(array_append(business_currencies, primary_currency)) as value
  );

  insert into public.businesses (
    name, sector, phone, location, currency, currencies,
    team_size, sales_mode, primary_needs, tracks_inventory,
    opening_cash, created_by
  )
  values (
    trim(business_name),
    business_sector,
    nullif(trim(business_phone), ''),
    nullif(trim(business_location), ''),
    primary_currency,
    selected_currencies,
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

  foreach currency_code in array selected_currencies
  loop
    opening_for_currency := coalesce(
      nullif(business_cash_openings ->> currency_code, '')::numeric,
      case when currency_code = primary_currency then business_opening_cash else 0 end
    );
    if opening_for_currency < 0 then
      opening_for_currency := 0;
    end if;
    insert into public.business_cash_accounts (
      business_id, currency, opening_balance
    )
    values (new_business_id, currency_code, opening_for_currency);
  end loop;

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

grant execute on function public.create_business(
  text, text, text, text, text, text, text, text[], boolean, text[], numeric, jsonb
) to authenticated;

-- Helper: currency is locked when it has sales, expenses, or a non-zero opening.
create or replace function public.currency_is_in_use(
  target_business_id uuid,
  target_currency text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.sales s
      where s.business_id = target_business_id
        and s.currency = upper(target_currency)
    )
    or exists (
      select 1
      from public.expenses e
      where e.business_id = target_business_id
        and e.currency = upper(target_currency)
    )
    or exists (
      select 1
      from public.business_cash_accounts a
      where a.business_id = target_business_id
        and a.currency = upper(target_currency)
        and a.opening_balance > 0
    );
$$;

grant execute on function public.currency_is_in_use(uuid, text) to authenticated;

commit;
