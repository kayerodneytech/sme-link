-- Allow multiple products/services without an SKU.
-- The original UNIQUE NULLS NOT DISTINCT treated every missing SKU as a duplicate.

begin;

alter table public.products
  drop constraint if exists products_business_id_sku_key;

drop index if exists products_business_id_sku_key;
drop index if exists products_business_sku_unique;

create unique index if not exists products_business_sku_unique
  on public.products (business_id, sku)
  where sku is not null and btrim(sku) <> '';

commit;
