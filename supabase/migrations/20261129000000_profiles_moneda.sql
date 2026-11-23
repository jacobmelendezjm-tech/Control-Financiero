-- =============================================================================
-- Orbe · Moneda del usuario
--
-- profiles.moneda: 'EUR' (euro, por defecto) o 'ARS' (peso argentino).
-- Todos los importes siguen en céntimos/centavos (enteros); la moneda solo
-- cambia cómo se muestran y se escriben.
--
-- Requiere 20261123000000_orbe_schema.sql. Idempotente.
-- =============================================================================

begin;

alter table public.profiles add column if not exists moneda text not null default 'EUR';

alter table public.profiles drop constraint if exists profiles_moneda_check;
alter table public.profiles
  add constraint profiles_moneda_check check (moneda in ('EUR', 'ARS'));

comment on column public.profiles.moneda is 'Moneda de los importes: EUR o ARS.';

commit;
