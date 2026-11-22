-- =============================================================================
-- Orbe · Correo electrónico en el perfil
--
-- profiles.email es una copia del correo con el que el usuario inicia sesión
-- (auth.users.email). La mantiene siempre la base de datos:
--  · al registrarse,
--  · si el usuario cambia de correo,
--  · y en cualquier insert/update del perfil se vuelve a poner el correo real,
--    así que el cliente no puede falsearlo.
--
-- Requiere 20261123000000_orbe_schema.sql. Idempotente.
-- =============================================================================

begin;

alter table public.profiles add column if not exists email text;
comment on column public.profiles.email is 'Correo de inicio de sesión (copia de auth.users.email, lo mantiene la base de datos).';

create index if not exists profiles_email_idx on public.profiles (lower(email));

-- El correo del perfil siempre es el de auth.users.
create or replace function public.orbe_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select u.email into new.email from auth.users u where u.id = new.user_id;
  return new;
end;
$$;
revoke execute on function public.orbe_profile_email() from public, anon, authenticated;

drop trigger if exists profiles_email_sync on public.profiles;
create trigger profiles_email_sync
  before insert or update on public.profiles
  for each row execute function public.orbe_profile_email();

-- Si el usuario cambia de correo, se actualiza su perfil.
create or replace function public.orbe_auth_email_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where user_id = new.id;
  return new;
end;
$$;
revoke execute on function public.orbe_auth_email_changed() from public, anon, authenticated;

drop trigger if exists orbe_on_auth_email_changed on auth.users;
create trigger orbe_on_auth_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.orbe_auth_email_changed();

-- Rellenar los perfiles que ya existen (el trigger pone el correo real).
update public.profiles p set email = u.email from auth.users u where u.id = p.user_id and p.email is distinct from u.email;

commit;
