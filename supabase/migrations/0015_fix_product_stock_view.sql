-- Harden product_stock: replace GROUP BY aggregate (can 502 via PostgREST)
-- with a per-product subquery, and restore grants after view replace.

begin;

drop view if exists public.product_stock;

create view public.product_stock
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
  coalesce(
    (
      select sum(m.quantity_change)
      from public.inventory_movements m
      where m.product_id = p.id
    ),
    0
  )::numeric(12, 3) as quantity_on_hand,
  p.size_value,
  p.size_unit,
  p.description,
  p.parent_product_id
from public.products p;

grant select on public.product_stock to anon, authenticated, service_role;

commit;
