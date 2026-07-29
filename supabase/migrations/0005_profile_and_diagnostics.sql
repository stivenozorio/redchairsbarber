-- ============================================================
-- RED CLUB — 0005: perfil enriquecido + diagnóstico
-- ============================================================
-- Seguro de ejecutar varias veces. No borra ni modifica datos
-- existentes: solo agrega columnas y funciones.
-- ============================================================

-- ------------------------------------------------------------
-- Perfil: avatar de Google y control del formulario de teléfono
-- ------------------------------------------------------------

alter table public.profiles add column if not exists avatar_url text;

-- El teléfono se pide UNA sola vez a quien entra con Google (Google no
-- lo entrega). Este flag evita volver a preguntarlo si el cliente
-- decide omitirlo.
alter table public.profiles
  add column if not exists phone_prompt_dismissed boolean not null default false;

-- ------------------------------------------------------------
-- Capturar el avatar al registrarse
-- ------------------------------------------------------------
-- Google manda la foto en 'avatar_url' o en 'picture' según el flujo.
-- Sigue siendo INSERT + on conflict do nothing: nunca sobrescribe un
-- perfil existente ni pisa datos editados a mano.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, avatar_url, referral_code)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    public.generate_referral_code()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Proteger campos sensibles (se re-declara por las columnas nuevas)
-- ------------------------------------------------------------
-- El cliente puede editar nombre, teléfono, avatar y cumpleaños, pero
-- NO su rol, sus visitas ni su código de referido.

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  new.role          := old.role;
  new.visit_count   := old.visit_count;
  new.referral_code := old.referral_code;
  new.referred_by   := old.referred_by;
  new.id            := old.id;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Reparar perfiles faltantes
-- ------------------------------------------------------------
-- Si alguien se registró antes de que el trigger existiera (o el
-- trigger falló), su perfil no existe y nada del club funciona para
-- esa cuenta. Esto lo crea sin tocar los perfiles ya existentes.

insert into public.profiles (id, email, full_name, phone, avatar_url, referral_code)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  nullif(u.raw_user_meta_data ->> 'phone', ''),
  coalesce(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  ),
  public.generate_referral_code()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ------------------------------------------------------------
-- Diagnóstico: una sola llamada que reporta el estado real
-- ------------------------------------------------------------
-- PostgREST no puede consultar pg_catalog directamente, así que se
-- expone como función. La usa GET /api/health para explicar
-- exactamente qué falta en vez de devolver un ok:false sin motivo.

create or replace function public.redclub_diagnostics()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'counts', (
      select jsonb_build_object(
        'tiers',    (select count(*) from public.tiers),
        'barbers',  (select count(*) from public.barbers),
        'services', (select count(*) from public.services),
        'profiles', (select count(*) from public.profiles),
        'bookings', (select count(*) from public.bookings),
        'booking_services', (select count(*) from public.booking_services),
        'auth_users', (select count(*) from auth.users)
      )
    ),
    'profiles_sin_perfil', (
      select count(*) from auth.users u
      where not exists (select 1 from public.profiles p where p.id = u.id)
    ),
    'foreign_keys', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'tabla', tc.table_name,
        'restriccion', tc.constraint_name,
        'columna', kcu.column_name,
        'referencia', ccu.table_name || '.' || ccu.column_name
      ) order by tc.table_name, tc.constraint_name), '[]'::jsonb)
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name
       and kcu.table_schema = tc.table_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
       and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY'
        and tc.table_schema = 'public'
    ),
    'indices', (
      select coalesce(jsonb_agg(indexname order by indexname), '[]'::jsonb)
      from pg_indexes where schemaname = 'public'
    ),
    'triggers', (
      select coalesce(jsonb_agg(distinct trigger_name), '[]'::jsonb)
      from information_schema.triggers
      where trigger_schema in ('public', 'auth')
    ),
    'funciones', (
      select coalesce(jsonb_agg(p.proname order by p.proname), '[]'::jsonb)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
    ),
    'vistas', (
      select coalesce(jsonb_agg(viewname order by viewname), '[]'::jsonb)
      from pg_views where schemaname = 'public'
    ),
    'rls_habilitado', (
      select coalesce(jsonb_object_agg(c.relname, c.relrowsecurity), '{}'::jsonb)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    ),
    'politicas', (
      select coalesce(jsonb_object_agg(tablename, cnt), '{}'::jsonb)
      from (
        select tablename, count(*) as cnt
        from pg_policies where schemaname = 'public'
        group by tablename
      ) p
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.redclub_diagnostics() from public, anon, authenticated;

-- ------------------------------------------------------------
-- Refrescar el cache de esquema de PostgREST
-- ------------------------------------------------------------
-- Sin esto, las consultas con relaciones embebidas
-- (bookings + booking_services) pueden fallar con
-- "Could not find a relationship ... in the schema cache"
-- hasta que Supabase recargue por su cuenta.

notify pgrst, 'reload schema';
