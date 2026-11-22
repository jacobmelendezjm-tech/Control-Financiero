-- =============================================================================
-- Orbe · Esquema relacional completo
--
-- Sustituye al documento único de public.finance_data (que se conserva solo para
-- migrar los datos antiguos la primera vez que la app se conecta).
--
-- Principios:
--  · Una fila por dato, con la clave (user_id, id). El id lo genera la app, que
--    funciona sin conexión y sincroniza después.
--  · Importes en céntimos (bigint): sin errores de redondeo.
--  · Borrado lógico con deleted_at: así los borrados también se sincronizan.
--  · updated_at lo pone siempre la base de datos; la app pide «lo cambiado desde…».
--  · Seguridad por fila (RLS): cada persona solo ve y cambia sus propios datos.
--
-- Se puede ejecutar varias veces sin romper nada (idempotente).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Utilidades
-- -----------------------------------------------------------------------------

-- updated_at = ahora en cada insert/update (el cliente no puede falsearlo).
create or replace function public.orbe_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Perfil y ajustes generales (1:1 con el usuario)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  nombre           text not null default '' check (char_length(nombre) <= 60),
  moneda           text not null default 'EUR' check (moneda ~ '^[A-Z]{3}$'),
  saldo_inicial    bigint not null default 0,
  hormiga_max      bigint not null default 1000 check (hormiga_max > 0),
  cobro            text check (cobro in ('fija', 'horas', 'autonomo', 'no')),
  neto_aprox       bigint check (neto_aprox >= 0),
  dia_cobro        smallint check (dia_cobro between 1 and 31),
  objetivo         text check (objetivo in ('ahorrar', 'emergencia', 'controlar', 'deudas', 'saber')),
  ahorro_mes       bigint check (ahorro_mes >= 0),
  onboarding_done  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.profiles is 'Perfil del formulario de bienvenida y ajustes generales (saldo inicial, umbral de gastos hormiga).';

-- -----------------------------------------------------------------------------
-- 2. Categorías (con su presupuesto mensual)
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  user_id      uuid not null references auth.users (id) on delete cascade,
  id           text not null check (char_length(id) between 1 and 64),
  nombre       text not null check (char_length(nombre) between 1 and 40),
  tipo         text not null check (tipo in ('g', 'i')),          -- gasto / ingreso
  grupo        text check (grupo in ('nec', 'des')),              -- necesidad / deseo (solo gastos)
  orden        integer not null default 0,
  presupuesto  bigint check (presupuesto > 0),                    -- límite mensual en céntimos
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  primary key (user_id, id),
  constraint categories_grupo_solo_gastos check (tipo = 'g' or grupo is null)
);

-- -----------------------------------------------------------------------------
-- 3. Gastos fijos mensuales (recurrentes)
-- -----------------------------------------------------------------------------
create table if not exists public.recurring (
  user_id      uuid not null references auth.users (id) on delete cascade,
  id           text not null check (char_length(id) between 1 and 64),
  nombre       text not null check (char_length(nombre) between 1 and 80),
  tipo         text not null check (tipo in ('g', 'i')),
  importe      bigint not null check (importe > 0),
  category_id  text not null,
  dia          smallint not null check (dia between 1 and 31),
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  primary key (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id) on update cascade
);

-- -----------------------------------------------------------------------------
-- 4. Movimientos (ingresos y gastos)
-- -----------------------------------------------------------------------------
create table if not exists public.transactions (
  user_id       uuid not null references auth.users (id) on delete cascade,
  id            text not null check (char_length(id) between 1 and 64),
  fecha         date not null,
  tipo          text not null check (tipo in ('g', 'i')),
  importe       bigint not null check (importe > 0),
  category_id   text not null,
  nota          text not null default '' check (char_length(nota) <= 120),
  recurring_id  text,                -- creado desde un fijo
  payslip_id    text,                -- creado desde una nómina
  hormiga       boolean,             -- marcado a mano como gasto hormiga (null = automático)
  orden         bigint not null default 0,   -- desempate dentro del mismo día
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  primary key (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id) on update cascade
);
create index if not exists transactions_user_fecha_idx
  on public.transactions (user_id, fecha desc) where deleted_at is null;

-- -----------------------------------------------------------------------------
-- 5. Metas de ahorro y su historial de aportaciones
-- -----------------------------------------------------------------------------
create table if not exists public.goals (
  user_id       uuid not null references auth.users (id) on delete cascade,
  id            text not null check (char_length(id) between 1 and 64),
  nombre        text not null check (char_length(nombre) between 1 and 60),
  objetivo      bigint not null check (objetivo > 0),
  ahorrado      bigint not null default 0,
  fecha_limite  date check (extract(day from fecha_limite) = 1),   -- primer día del mes objetivo
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  primary key (user_id, id)
);

create table if not exists public.goal_contributions (
  user_id     uuid not null references auth.users (id) on delete cascade,
  id          text not null check (char_length(id) between 1 and 64),
  goal_id     text not null,
  fecha       date not null default current_date,
  importe     bigint not null check (importe <> 0),   -- negativo = retirada
  nota        text not null default '' check (char_length(nota) <= 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  primary key (user_id, id),
  foreign key (user_id, goal_id) references public.goals (user_id, id) on delete cascade
);
create index if not exists goal_contributions_goal_idx on public.goal_contributions (user_id, goal_id, fecha);

-- -----------------------------------------------------------------------------
-- 6. Trabajo: ajustes, horario por turnos, jornadas y nóminas
-- -----------------------------------------------------------------------------
create table if not exists public.work_settings (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  horas_dia      numeric(4, 2) not null default 8 check (horas_dia > 0 and horas_dia <= 24),
  horas_semana   numeric(5, 2) not null default 40 check (horas_semana > 0 and horas_semana <= 168),
  precio_hora    bigint not null default 0 check (precio_hora >= 0),
  precio_extra   bigint not null default 0 check (precio_extra >= 0),
  hora_entrada   time not null default '09:00',
  hora_salida    time not null default '17:30',
  pausa_min      smallint not null default 30 check (pausa_min between 0 and 600),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.work_schedules (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  activo       boolean not null default true,
  ancla        date not null check (extract(isodow from ancla) = 1),   -- lunes de la semana 1 del ciclo
  semanas      smallint not null check (semanas between 1 and 4),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.work_schedule_days (
  user_id       uuid not null references public.work_schedules (user_id) on delete cascade,
  semana        smallint not null check (semana between 0 and 3),
  dia           smallint not null check (dia between 0 and 6),          -- 0 = lunes … 6 = domingo
  hora_entrada  time not null,
  hora_salida   time not null,
  pausa_min     smallint not null default 0 check (pausa_min between 0 and 600),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (user_id, semana, dia)
);

create table if not exists public.shifts (
  user_id       uuid not null references auth.users (id) on delete cascade,
  id            text not null check (char_length(id) between 1 and 64),
  fecha         date not null,
  tipo          text not null check (tipo in ('trabajo', 'vacaciones', 'festivo', 'baja', 'libre')),
  hora_entrada  time,
  hora_salida   time,
  pausa_min     smallint not null default 0 check (pausa_min between 0 and 600),
  extra_min     integer check (extra_min >= 0),   -- horas extra indicadas a mano (null = automático)
  nota          text not null default '' check (char_length(nota) <= 60),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  primary key (user_id, id),
  constraint shifts_horas_si_trabajo check (tipo <> 'trabajo' or (hora_entrada is not null and hora_salida is not null))
);
create index if not exists shifts_user_fecha_idx on public.shifts (user_id, fecha) where deleted_at is null;

create table if not exists public.payslips (
  user_id          uuid not null references auth.users (id) on delete cascade,
  id               text not null check (char_length(id) between 1 and 64),
  mes              date not null check (extract(day from mes) = 1),   -- mes trabajado
  fecha_cobro      date not null,
  bruto            bigint not null check (bruto >= 0),
  irpf             bigint not null default 0 check (irpf >= 0),
  seg_social       bigint not null default 0 check (seg_social >= 0),
  otros            bigint not null default 0,
  neto             bigint not null check (neto > 0),
  extras           bigint not null default 0 check (extras >= 0),
  horas_extra_min  integer not null default 0 check (horas_extra_min >= 0),
  transaction_id   text,              -- ingreso creado a partir de la nómina
  nota             text not null default '' check (char_length(nota) <= 120),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  primary key (user_id, id)
);
create index if not exists payslips_user_mes_idx on public.payslips (user_id, mes desc) where deleted_at is null;

-- -----------------------------------------------------------------------------
-- 7. Triggers de updated_at e índices de sincronización
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'categories', 'recurring', 'transactions', 'goals', 'goal_contributions',
    'work_settings', 'work_schedules', 'work_schedule_days', 'shifts', 'payslips'
  ]
  loop
    execute format('drop trigger if exists %1$s_touch on public.%1$I', t);
    execute format('create trigger %1$s_touch before insert or update on public.%1$I for each row execute function public.orbe_touch()', t);
    -- «Dame lo cambiado desde…»: la consulta de la sincronización.
    execute format('create index if not exists %1$s_sync_idx on public.%1$I (user_id, updated_at)', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. Seguridad por fila
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'categories', 'recurring', 'transactions', 'goals', 'goal_contributions',
    'work_settings', 'work_schedules', 'work_schedule_days', 'shifts', 'payslips'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on table public.%I to authenticated', t);

    execute format('drop policy if exists "Orbe: leer los propios" on public.%I', t);
    execute format('create policy "Orbe: leer los propios" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);

    execute format('drop policy if exists "Orbe: crear los propios" on public.%I', t);
    execute format('create policy "Orbe: crear los propios" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);

    execute format('drop policy if exists "Orbe: editar los propios" on public.%I', t);
    execute format('create policy "Orbe: editar los propios" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- El horario se guarda completo cada vez: sus días sí se pueden borrar.
grant delete on table public.work_schedule_days to authenticated;
drop policy if exists "Orbe: borrar los propios" on public.work_schedule_days;
create policy "Orbe: borrar los propios" on public.work_schedule_days
  for delete to authenticated using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 9. Perfil automático al registrarse (y para los usuarios que ya existen)
-- -----------------------------------------------------------------------------
create or replace function public.orbe_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.work_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.orbe_handle_new_user() from public, anon, authenticated;

drop trigger if exists orbe_on_auth_user_created on auth.users;
create trigger orbe_on_auth_user_created
  after insert on auth.users
  for each row execute function public.orbe_handle_new_user();

insert into public.profiles (user_id) select id from auth.users on conflict do nothing;
insert into public.work_settings (user_id) select id from auth.users on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 10. Vistas de análisis (respetan la seguridad por fila de quien consulta)
-- -----------------------------------------------------------------------------
create or replace view public.v_resumen_mensual
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', fecha)::date                         as mes,
  coalesce(sum(importe) filter (where tipo = 'i'), 0)::bigint as ingresos,
  coalesce(sum(importe) filter (where tipo = 'g'), 0)::bigint as gastos,
  coalesce(sum(case when tipo = 'i' then importe else -importe end), 0)::bigint as balance,
  count(*)::integer                                        as movimientos
from public.transactions
where deleted_at is null
group by user_id, date_trunc('month', fecha);

create or replace view public.v_gasto_por_categoria
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.fecha)::date as mes,
  t.category_id,
  c.nombre                           as categoria,
  c.grupo,
  c.presupuesto,
  sum(t.importe)::bigint             as total,
  count(*)::integer                  as movimientos
from public.transactions t
join public.categories c on c.user_id = t.user_id and c.id = t.category_id
where t.deleted_at is null and t.tipo = 'g'
group by t.user_id, date_trunc('month', t.fecha), t.category_id, c.nombre, c.grupo, c.presupuesto;

create or replace view public.v_horas_mensuales
with (security_invoker = true) as
select
  user_id,
  date_trunc('month', fecha)::date as mes,
  count(distinct fecha) filter (where tipo = 'trabajo')::integer as dias_trabajados,
  coalesce(sum(
    case when tipo = 'trabajo' then
      greatest(0,
        (extract(epoch from (hora_salida - hora_entrada)) / 60)::integer
        + case when hora_salida < hora_entrada then 1440 else 0 end
        - pausa_min)
    end), 0)::integer as minutos_trabajados,
  coalesce(sum(extra_min), 0)::integer as minutos_extra_manuales,
  count(*) filter (where tipo = 'vacaciones')::integer as dias_vacaciones,
  count(*) filter (where tipo = 'baja')::integer       as dias_baja
from public.shifts
where deleted_at is null
group by user_id, date_trunc('month', fecha);

grant select on public.v_resumen_mensual, public.v_gasto_por_categoria, public.v_horas_mensuales to authenticated;
revoke all on public.v_resumen_mensual, public.v_gasto_por_categoria, public.v_horas_mensuales from anon;

-- -----------------------------------------------------------------------------
-- 11. Tiempo real: otros dispositivos se enteran de los cambios al momento
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach t in array array[
    'profiles', 'categories', 'recurring', 'transactions', 'goals', 'goal_contributions',
    'work_settings', 'work_schedules', 'shifts', 'payslips'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null; -- ya estaba
    end;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 12. Documento antiguo: se mantiene solo para migrar
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.finance_data') is not null then
    comment on table public.finance_data is 'OBSOLETA: formato antiguo (un documento por usuario). La app lo lee una sola vez para migrar a las tablas nuevas.';
  end if;
end;
$$;

commit;
