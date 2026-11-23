-- =============================================================================
-- Orbe · Endurecer los recordatorios (resultado del pentest del 23/11/2026)
--
-- orbe_push_sync y orbe_push_unsubscribe se pueden llamar sin cuenta (los
-- recordatorios funcionan sin registrarse). Hasta ahora aceptaban:
--   · cualquier URL https como «endpoint» → el cron enviaba peticiones a donde
--     quisiera quien la registrase;
--   · avisos con textos y enlaces de cualquier tamaño o a otra web;
--   · pisar o borrar la suscripción de un usuario con cuenta conociendo su endpoint.
-- Ahora:
--   · solo servicios de notificaciones reales (Google/Chrome, Mozilla, Microsoft, Apple);
--   · cada aviso con id, hora, título (≤ 120), texto (≤ 400), enlace interno (/…) y etiqueta;
--   · una suscripción de un usuario con cuenta solo la cambia o la borra ese usuario.
--
-- Requiere 20261125000000_push_reminders.sql. Idempotente.
-- =============================================================================

begin;

create or replace function public.orbe_push_endpoint_ok(p_endpoint text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_endpoint is not null
     and char_length(p_endpoint) <= 1000
     and p_endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com)/';
$$;

create or replace function public.orbe_push_agenda_ok(p_agenda jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_agenda) = 'array'
     and jsonb_array_length(p_agenda) <= 300
     and not exists (
       select 1 from jsonb_array_elements(p_agenda) e
       where jsonb_typeof(e) <> 'object'
          or coalesce(char_length(e->>'id'), 0) not between 1 and 64
          or coalesce(e->>'at', '') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'
          or coalesce(char_length(e->>'title'), 0) not between 1 and 120
          or coalesce(char_length(e->>'body'), 0) > 400
          or (e ? 'url' and coalesce(e->>'url', '') !~ '^/([^/\\].*)?$')
          or coalesce(char_length(e->>'url'), 0) > 200
          or coalesce(char_length(e->>'tag'), 0) > 64
     );
$$;

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
  v_owner uuid;
begin
  if not public.orbe_push_endpoint_ok(p_endpoint) then
    raise exception 'Servicio de notificaciones no admitido' using errcode = '22023';
  end if;
  if not public.orbe_push_agenda_ok(p_agenda) then
    raise exception 'Agenda no válida' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := 'Europe/Madrid';
  end if;

  -- Una suscripción de alguien con cuenta solo la puede tocar esa persona.
  select user_id into v_owner from public.push_subscriptions where endpoint = p_endpoint;
  if v_owner is not null and v_owner is distinct from auth.uid() then
    raise exception 'No autorizado' using errcode = '42501';
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

create or replace function public.orbe_push_unsubscribe(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions
   where endpoint = p_endpoint
     and (user_id is null or user_id = auth.uid());
$$;

-- Limpieza: suscripciones que no cumplen las reglas nuevas (no deberían existir).
delete from public.push_subscriptions
 where not public.orbe_push_endpoint_ok(endpoint)
    or not public.orbe_push_agenda_ok(agenda);

revoke execute on function public.orbe_push_endpoint_ok(text) from public, anon, authenticated;
revoke execute on function public.orbe_push_agenda_ok(jsonb) from public, anon, authenticated;
revoke execute on function public.orbe_push_sync(text, text, text, text, jsonb, boolean, smallint) from public;
revoke execute on function public.orbe_push_unsubscribe(text) from public;
grant execute on function public.orbe_push_sync(text, text, text, text, jsonb, boolean, smallint) to anon, authenticated;
grant execute on function public.orbe_push_unsubscribe(text) to anon, authenticated;

commit;
