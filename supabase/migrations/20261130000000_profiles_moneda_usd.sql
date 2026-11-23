-- =============================================================================
-- Orbe · Dólar estadounidense como moneda
--
-- Amplía profiles.moneda para admitir 'USD' además de 'EUR' y 'ARS'.
--
-- Requiere 20261129000000_profiles_moneda.sql. Idempotente.
-- =============================================================================

begin;

alter table public.profiles drop constraint if exists profiles_moneda_check;
alter table public.profiles
  add constraint profiles_moneda_check check (moneda in ('EUR', 'ARS', 'USD'));

comment on column public.profiles.moneda is 'Moneda de los importes: EUR, ARS o USD.';

commit;
