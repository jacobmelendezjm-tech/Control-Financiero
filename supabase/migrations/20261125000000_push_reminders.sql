-- =============================================================================
-- Orbe · Notificaciones push y recordatorios
--
-- Cómo funciona:
--  1. La app (con o sin cuenta) se suscribe a las notificaciones del navegador y
--     guarda aquí su suscripción y su «agenda»: los avisos de los próximos días
--     (fichar, nómina, fijos, resumen diario/semanal) con su hora local.
--  2. Cada 10 minutos pg_cron llama a la web (/api/push/cron) con un secreto.
--  3. La web pide a orbe_push_due() los avisos que ya tocan, los envía con Web Push
--     y avisa con orbe_push_gone() de las suscripciones que ya no existen.
--
-- Las tablas no son accesibles directamente: solo a través de estas funciones.
-- Los secretos (claves VAPID y secreto del cron) van en orbe_private.config y se
-- cargan aparte con supabase/private/push_setup.sql (no se sube al repositorio).
--
-- Idempotente.
-- =============================================================================

begin;

create schema if not exists orbe_private;
revoke all on schema orbe_private from public, anon, authenticated;

create table if not exists orbe_private.config (
  key   text primary key,
  value text not null
);
revoke all on table orbe_private.config from public, anon, authenticated;

-- Suscripciones ---------------------------------------------------------------
create table if not exists public.push_subscriptions (
  endpoint       text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh         text not null check (char_length(p256dh) <= 200),
  auth           text not null check (char_length(auth) <= 100),
  user_id        uuid references auth.users (id) on delete cascade,
  tz             text not null default 'Europe/Madrid',
  agenda         jsonb not null default '[]' check (jsonb_typeof(agenda) = 'array'),
  nudge          boolean not null default true,     -- «te echo de menos» si no entras en días
  hora_nudge     smallint not null default 20 check (hora_nudge between 0 and 23),
  last_seen_at   timestamptz not null default now(),
  last_nudge_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.push_subscriptions is 'Suscripciones Web Push de cada dispositivo y su agenda de recordatorios. Solo se accede mediante funciones.';

create table if not exists public.push_sent (
  endpoint  text not null references public.push_subscriptions (endpoint) on delete cascade,
  item_id   text not null,
  sent_at   timestamptz not null default now(),
  primary key (endpoint, item_id)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_sent enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;
revoke all on table public.push_sent from anon, authenticated;

-- Guardar/actualizar la suscripción y la agenda (lo llama la app) -----------------
create or replace function public.orbe_push_sync(
  p_endpoint text,
  p_p256dh   text,
  p_auth     text,
  p_tz       text,
  p_agenda   jsonb,
  p_nudge    boolean default true,
  p_hora     smallint default 20
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text := coalesce(nullif(p_tz, ''), 'Europe/Madrid');
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := 'Europe/Madrid';
  end if;
  if jsonb_typeof(p_agenda) <> 'array' or jsonb_array_length(p_agenda) > 300 then
    raise exception 'Agenda no válida' using errcode = '22023';
  end if;

  insert into public.push_subscriptions as s (endpoint, p256dh, auth, user_id, tz, agenda, nudge, hora_nudge, last_seen_at)
  values (p_endpoint, p_p256dh, p_auth, auth.uid(), v_tz, p_agenda, coalesce(p_nudge, true), coalesce(p_hora, 20), now())
  on conflict (endpoint) do update set
    p256dh       = excluded.p256dh,
    auth         = excluded.auth,
    user_id      = coalesce(auth.uid(), s.user_id),
    tz           = excluded.tz,
    agenda       = excluded.agenda,
    nudge        = excluded.nudge,
    hora_nudge   = excluded.hora_nudge,
    last_seen_at = now(),
    updated_at   = now();
end;
$$;

-- Darse de baja (lo llama la app) -------------------------------------------------
create or replace function public.orbe_push_unsubscribe(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

-- Avisos que tocan ahora (lo llama la web desde el cron, con el secreto) -----------
create or replace function public.orbe_push_due(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_nudges jsonb := '[]'::jsonb;
  v_textos text[] := array[
    '¡Hola! Hace unos días que no pasas por Orbe. ¿Apuntamos lo que has gastado?',
    'Orbi te echa de menos 🛰️ Un minuto para poner tus cuentas al día.',
    'Tus finanzas te esperan. Entra y mira cómo vas este mes.'
  ];
begin
  if p_secret is null or p_secret is distinct from (select value from orbe_private.config where key = 'cron_secret') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  -- 1) Elementos de la agenda cuya hora local ya ha llegado (hasta 3 h de margen).
  with due as (
    select s.endpoint, s.p256dh, s.auth, e as item
    from public.push_subscriptions s
    cross join lateral jsonb_array_elements(s.agenda) e
    where (e->>'at') is not null
      and ((e->>'at')::timestamp at time zone s.tz) <= now()
      and ((e->>'at')::timestamp at time zone s.tz) > now() - interval '3 hours'
      and not exists (select 1 from public.push_sent p where p.endpoint = s.endpoint and p.item_id = e->>'id')
  ),
  marked as (
    insert into public.push_sent (endpoint, item_id)
    select endpoint, item->>'id' from due
    on conflict do nothing
    returning endpoint, item_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'endpoint', d.endpoint, 'p256dh', d.p256dh, 'auth', d.auth,
      'title', d.item->>'title', 'body', d.item->>'body',
      'url', coalesce(d.item->>'url', '/'), 'tag', coalesce(d.item->>'tag', d.item->>'id'))), '[]'::jsonb)
    into v_items
  from due d
  join marked m on m.endpoint = d.endpoint and m.item_id = d.item->>'id';

  -- 2) «Te echo de menos»: sin entrar en 3 días, a su hora, como mucho cada 3 días.
  with lazy as (
    update public.push_subscriptions s
       set last_nudge_at = now()
     where s.nudge
       and s.last_seen_at < now() - interval '3 days'
       and (s.last_nudge_at is null or s.last_nudge_at < now() - interval '3 days')
       and extract(hour from now() at time zone s.tz) = s.hora_nudge
    returning s.endpoint, s.p256dh, s.auth
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'endpoint', endpoint, 'p256dh', p256dh, 'auth', auth,
      'title', 'Orbe', 'body', v_textos[1 + floor(random() * array_length(v_textos, 1))::int],
      'url', '/', 'tag', 'orbe-nudge')), '[]'::jsonb)
    into v_nudges
  from lazy;

  delete from public.push_sent where sent_at < now() - interval '30 days';

  return jsonb_build_object(
    'vapid_public',  (select value from orbe_private.config where key = 'vapid_public'),
    'vapid_private', (select value from orbe_private.config where key = 'vapid_private'),
    'subject',       coalesce((select value from orbe_private.config where key = 'vapid_subject'), 'mailto:soporte.moneycare.orbe@gmail.com'),
    'items',         v_items || v_nudges
  );
end;
$$;

-- Suscripciones caducadas (lo llama la web tras enviar) ----------------------------
create or replace function public.orbe_push_gone(p_secret text, p_endpoints text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is null or p_secret is distinct from (select value from orbe_private.config where key = 'cron_secret') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = any (p_endpoints);
end;
$$;

revoke execute on function public.orbe_push_sync(text, text, text, text, jsonb, boolean, smallint) from public;
revoke execute on function public.orbe_push_unsubscribe(text) from public;
revoke execute on function public.orbe_push_due(text) from public;
revoke execute on function public.orbe_push_gone(text, text[]) from public;
grant execute on function public.orbe_push_sync(text, text, text, text, jsonb, boolean, smallint) to anon, authenticated;
grant execute on function public.orbe_push_unsubscribe(text) to anon, authenticated;
-- Protegidas por el secreto del cron:
grant execute on function public.orbe_push_due(text) to anon, authenticated;
grant execute on function public.orbe_push_gone(text, text[]) to anon, authenticated;

commit;
