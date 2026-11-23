-- =============================================================================
-- Orbe · Semanas planificadas, «cubro a alguien» y notas del calendario
--
-- 1) work_week_plans: para quien tiene un horario distinto cada semana sin patrón fijo. Una fila por
-- día de cada semana planificada (las 7, para saber qué días son libres:
-- hora_entrada y hora_salida nulas). Tiene prioridad sobre el horario rotativo.
-- La app rehace la semana entera al guardarla, por eso se permite borrar.
--
-- Requiere 20261123000000_orbe_schema.sql. Idempotente.
-- =============================================================================

begin;

create table if not exists public.work_week_plans (
  user_id       uuid not null references auth.users (id) on delete cascade,
  lunes         date not null check (extract(isodow from lunes) = 1),
  dia           smallint not null check (dia between 0 and 6),   -- 0 = lunes … 6 = domingo
  hora_entrada  time,
  hora_salida   time,
  pausa_min     smallint not null default 0 check (pausa_min between 0 and 600),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, lunes, dia),
  constraint work_week_plans_horas check ((hora_entrada is null) = (hora_salida is null))
);
comment on table public.work_week_plans is 'Horario de semanas concretas (turnos distintos cada semana). Horas nulas = día libre.';

drop trigger if exists work_week_plans_touch on public.work_week_plans;
create trigger work_week_plans_touch before insert or update on public.work_week_plans
  for each row execute function public.orbe_touch();
create index if not exists work_week_plans_sync_idx on public.work_week_plans (user_id, updated_at);

alter table public.work_week_plans enable row level security;
revoke all on table public.work_week_plans from anon, authenticated;
grant select, insert, update, delete on table public.work_week_plans to authenticated;

drop policy if exists "Orbe: leer los propios" on public.work_week_plans;
create policy "Orbe: leer los propios" on public.work_week_plans
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Orbe: crear los propios" on public.work_week_plans;
create policy "Orbe: crear los propios" on public.work_week_plans
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Orbe: editar los propios" on public.work_week_plans;
create policy "Orbe: editar los propios" on public.work_week_plans
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Orbe: borrar los propios" on public.work_week_plans;
create policy "Orbe: borrar los propios" on public.work_week_plans
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 2) «Cubro a alguien»: turnos cubriendo a otra persona (amarillo en el calendario).
alter table public.work_week_plans    add column if not exists cubre boolean not null default false;
alter table public.work_schedule_days add column if not exists cubre boolean not null default false;
alter table public.shifts             add column if not exists cubre boolean not null default false;

-- 3) Notas del calendario, una por día.
create table if not exists public.work_day_notes (
  user_id     uuid not null references auth.users (id) on delete cascade,
  fecha       date not null,
  nota        text not null check (char_length(nota) between 1 and 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, fecha)
);
drop trigger if exists work_day_notes_touch on public.work_day_notes;
create trigger work_day_notes_touch before insert or update on public.work_day_notes
  for each row execute function public.orbe_touch();
create index if not exists work_day_notes_sync_idx on public.work_day_notes (user_id, updated_at);
alter table public.work_day_notes enable row level security;
revoke all on table public.work_day_notes from anon, authenticated;
grant select, insert, update, delete on table public.work_day_notes to authenticated;
drop policy if exists "Orbe: leer los propios" on public.work_day_notes;
create policy "Orbe: leer los propios" on public.work_day_notes
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Orbe: crear los propios" on public.work_day_notes;
create policy "Orbe: crear los propios" on public.work_day_notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Orbe: editar los propios" on public.work_day_notes;
create policy "Orbe: editar los propios" on public.work_day_notes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Orbe: borrar los propios" on public.work_day_notes;
create policy "Orbe: borrar los propios" on public.work_day_notes
  for delete to authenticated using ((select auth.uid()) = user_id);

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['work_week_plans', 'work_day_notes'] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end;
$$;

commit;
