-- Product size (e.g. 500 ml, 10 kg) so the same name can have different sizes and prices.
-- Apply after 0005_product_categories.sql.
--
-- Note: CREATE OR REPLACE VIEW can only append columns at the end.
-- New size fields must stay after quantity_on_hand.

begin;

alter table public.products
  add column if not exists size_value numeric(12, 3)
    check (size_value is null or size_value > 0),
  add column if not exists size_unit text
    check (
      size_unit is null
      or size_unit in ('ml', 'L', 'g', 'kg')
    );

alter table public.products
  drop constraint if exists products_size_pair_check;

alter table public.products
  add constraint products_size_pair_check
  check (
    (size_value is null and size_unit is null)
    or (size_value is not null and size_unit is not null)
  );

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
  p.size_unit
from public.products p
left join public.inventory_movements m on m.product_id = p.id
group by p.id;

commit;
