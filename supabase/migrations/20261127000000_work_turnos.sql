-- =============================================================================
-- Orbe · Turnos rotativos en la ficha «Tu jornada»
--
-- work_settings gana tres columnas:
--   modo         'fijo' | 'turnos' (null = la app lo deduce de si hay cuadrante)
--   extra_regla  'turno'  → extra = lo que pasa del turno previsto (y el día entero si no tocaba)
--                'semana' → extra = lo que pasa de las horas de contrato semanales
--   turnos       turnos tipo del usuario en JSON: [{"n":"Mañana","ini":"06:00","fin":"14:00","pausa":0}, …]
--                Se guarda como texto para que la ida y vuelta con la app sea idéntica.
--
-- Requiere 20261123000000_orbe_schema.sql. Idempotente.
-- =============================================================================

begin;

alter table public.work_settings
  add column if not exists modo        text,
  add column if not exists extra_regla text,
  add column if not exists turnos      text;

alter table public.work_settings drop constraint if exists work_settings_modo_check;
alter table public.work_settings
  add constraint work_settings_modo_check check (modo is null or modo in ('fijo', 'turnos'));

alter table public.work_settings drop constraint if exists work_settings_extra_regla_check;
alter table public.work_settings
  add constraint work_settings_extra_regla_check check (extra_regla is null or extra_regla in ('turno', 'semana'));

alter table public.work_settings drop constraint if exists work_settings_turnos_check;
alter table public.work_settings
  add constraint work_settings_turnos_check check (turnos is null or (length(turnos) <= 2000 and jsonb_typeof(turnos::jsonb) = 'array'));

comment on column public.work_settings.modo is 'Cómo trabaja: fijo o turnos rotativos.';
comment on column public.work_settings.extra_regla is 'Regla de horas extra con turnos: turno o semana.';
comment on column public.work_settings.turnos is 'Turnos tipo (JSON) para elegirlos con un toque.';

commit;
