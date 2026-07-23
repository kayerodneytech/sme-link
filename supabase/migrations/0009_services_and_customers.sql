-- Service catalog fields + richer customers.
-- Safe to run after 0008_multi_currency_cash.sql.

begin;

-- ---------- Services on products (tiers via parent_product_id) ----------

alter table public.products
  add column if not exists description text;

alter table public.products
  add column if not exists parent_product_id uuid
    references public.products(id) on delete cascade;

create index if not exists products_parent_product_id_idx
  on public.products(parent_product_id);

alter table public.products drop constraint if exists products_parent_not_self_check;
alter table public.products
  add constraint products_parent_not_self_check
  check (parent_product_id is null or parent_product_id <> id);

-- Append-only columns on product_stock view
create or replace view public.product_stock
with (security_invoker = true)
as
select
  p.id,
  p.business_id,
  p.name,
  p.sku,
  p.barcode,
  p.category,
  p.product_type,
  p.unit,
  p.pack_size,
  p.cost_price,
  p.selling_price,
  p.reorder_level,
  p.is_archived,
  coalesce(sum(m.quantity_change), 0)::numeric(12, 3) as quantity_on_hand,
  p.size_value,
  p.size_unit,
  p.description,
  p.parent_product_id
from public.products p
left join public.inventory_movements m on m.product_id = p.id
group by p.id;

-- ---------- Richer customer records ----------

alter table public.customers
  add column if not exists company_name text,
  add column if not exists whatsapp text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists tax_number text;

alter table public.customers drop constraint if exists customers_company_name_len_check;
alter table public.customers
  add constraint customers_company_name_len_check
  check (
    company_name is null
    or char_length(company_name) between 1 and 160
  );

commit;
