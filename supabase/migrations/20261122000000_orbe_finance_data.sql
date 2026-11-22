-- =============================================================================
-- Orbe · Datos de la app en la nube
--
-- Una fila por usuario con todos sus datos (movimientos, metas, jornadas,
-- nóminas y ajustes) en un documento JSON: el mismo formato que la app guarda
-- en el dispositivo y que exporta como copia completa.
--
-- updated_at hace de "versión": la app solo sobrescribe la fila si nadie la ha
-- cambiado desde la última vez que la leyó; si no, pregunta qué datos conservar.
--
-- Se puede ejecutar varias veces sin romper nada (idempotente).
-- =============================================================================

begin;

-- updated_at automático ----------------------------------------------------------
create or replace function public.orbe_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Tabla ------------------------------------------------------------------------
create table if not exists public.finance_data (
  -- 1:1 con auth.users; al borrar la cuenta se borran sus datos.
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),

  constraint finance_data_objeto check (jsonb_typeof(data) = 'object'),
  -- Límite de tamaño razonable (la app guarda bastante menos).
  constraint finance_data_tamano check (pg_column_size(data) < 5000000)
);

comment on table  public.finance_data            is 'Datos completos de Orbe de cada usuario (mismo formato que la copia completa).';
comment on column public.finance_data.updated_at is 'Lo pone la base de datos en cada cambio; la app lo usa para detectar ediciones desde otro dispositivo.';

drop trigger if exists finance_data_set_updated_at on public.finance_data;
create trigger finance_data_set_updated_at
  before update on public.finance_data
  for each row execute function public.orbe_set_updated_at();

-- Seguridad: cada persona solo ve y cambia su propia fila ------------------------
alter table public.finance_data enable row level security;

revoke all on table public.finance_data from anon, authenticated;
grant select                 on table public.finance_data to authenticated;
grant insert (user_id, data) on table public.finance_data to authenticated;
grant update (data)          on table public.finance_data to authenticated;

drop policy if exists "Orbe: leer los propios" on public.finance_data;
create policy "Orbe: leer los propios"
  on public.finance_data for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Orbe: crear los propios" on public.finance_data;
create policy "Orbe: crear los propios"
  on public.finance_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Orbe: editar los propios" on public.finance_data;
create policy "Orbe: editar los propios"
  on public.finance_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Borrar la cuenta (RGPD): borra el usuario y, en cascada, sus datos ---------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No hay sesión iniciada' using errcode = '42501';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

comment on function public.delete_my_account() is 'Borra la cuenta del usuario con sesión y, en cascada, todos sus datos.';

revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;

commit;
