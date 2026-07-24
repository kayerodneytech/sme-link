-- Custom expense categories and optional subcategories.

begin;

alter table public.expense_categories
  add column if not exists parent_id uuid
    references public.expense_categories(id) on delete cascade;

create index if not exists expense_categories_parent_id_idx
  on public.expense_categories(parent_id);

alter table public.expense_categories
  drop constraint if exists expense_categories_business_id_name_key;

drop index if exists expense_categories_business_id_name_key;

-- Same name allowed under different parents; unique among siblings (including top-level).
create unique index if not exists expense_categories_unique_name_per_parent
  on public.expense_categories (
    business_id,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    name
  );

alter table public.expenses
  add column if not exists subcategory_id uuid
    references public.expense_categories(id) on delete set null;

create index if not exists expenses_subcategory_id_idx
  on public.expenses(subcategory_id);

commit;
