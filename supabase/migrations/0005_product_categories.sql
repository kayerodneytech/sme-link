-- Manageable product groups (categories) for inventory.
-- Apply after 0004_vat_settings.sql.

begin;

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create index if not exists product_categories_business_id_idx
  on public.product_categories(business_id);

alter table public.product_categories enable row level security;

create policy "product_categories_member_all" on public.product_categories
for all using (public.is_business_member(business_id))
with check (public.is_business_member(business_id));

-- Copy any free-text product categories already in use.
insert into public.product_categories (business_id, name)
select distinct p.business_id, trim(p.category)
from public.products p
where p.category is not null
  and char_length(trim(p.category)) >= 2
on conflict (business_id, name) do nothing;

commit;
