-- =============================================================================
-- Orbe · Intereses del usuario (formulario «¿Qué te interesa?»)
--
-- profiles.intereses: lista separada por comas de
--   gastos, ahorro, horas, nominas, hormiga, presupuesto
-- La app la usa para ordenar los accesos y las tarjetas de Inicio.
--
-- Requiere 20261123000000_orbe_schema.sql. Idempotente.
-- =============================================================================

begin;

alter table public.profiles add column if not exists intereses text;

alter table public.profiles drop constraint if exists profiles_intereses_check;
alter table public.profiles
  add constraint profiles_intereses_check
  check (intereses is null or intereses ~ '^(gastos|ahorro|horas|nominas|hormiga|presupuesto)(,(gastos|ahorro|horas|nominas|hormiga|presupuesto))*$');

comment on column public.profiles.intereses is 'Lo que más le interesa (separado por comas): ordena Inicio.';

commit;
