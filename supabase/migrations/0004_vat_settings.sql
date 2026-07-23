-- Tax settings for receipts. Prices entered in the app are treated as
-- VAT-inclusive when VAT is switched on.
-- Apply after 0003_atomic_onboarding.sql.

begin;

alter table public.businesses
  add column if not exists vat_registered boolean not null default false,
  add column if not exists vat_rate numeric(5, 2) not null default 15
    check (vat_rate >= 0 and vat_rate <= 100);

commit;
