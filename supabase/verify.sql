-- ============================================================
-- RED CLUB — verificación de la base de datos
-- ============================================================
-- SOLO LECTURA. No crea, no modifica ni elimina nada.
-- Ejecutar en Supabase → SQL Editor después de las migraciones.
-- Cada bloque devuelve una columna "estado" con OK o FALTA.
-- ============================================================

-- 1. Tablas del modelo -----------------------------------------
select
  t.nombre as tabla,
  case when c.oid is null then '❌ FALTA' else '✅ OK' end as estado,
  case when c.relrowsecurity then 'RLS activo' else '⚠️ SIN RLS' end as seguridad
from (values
  ('profiles'), ('barbers'), ('services'), ('tiers'), ('bookings'),
  ('booking_services'), ('points_transactions'), ('rewards'),
  ('reward_redemptions'), ('referrals'), ('memberships')
) as t(nombre)
left join pg_class c
  on c.relname = t.nombre
 and c.relnamespace = 'public'::regnamespace
 and c.relkind = 'r'
order by t.nombre;

-- 2. profiles está atado a auth.users ---------------------------
select
  case when count(*) = 1 then '✅ OK' else '❌ FALTA' end as estado,
  'profiles.id → auth.users.id' as relacion
from information_schema.table_constraints tc
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
where tc.table_name = 'profiles'
  and tc.constraint_type = 'FOREIGN KEY'
  and ccu.table_name = 'users';

-- 3. Usuarios sin perfil (debe ser 0) ---------------------------
select
  count(*) as usuarios_sin_perfil,
  case when count(*) = 0 then '✅ OK'
       else '❌ Ejecuta 0005_profile_and_diagnostics.sql' end as estado
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 4. Llaves foráneas -------------------------------------------
select
  tc.table_name    as tabla,
  kcu.column_name  as columna,
  ccu.table_name || '.' || ccu.column_name as apunta_a
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;

-- 5. Índices ----------------------------------------------------
select tablename as tabla, indexname as indice
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 6. Triggers ---------------------------------------------------
select
  t.nombre as trigger_esperado,
  case when exists (
    select 1 from information_schema.triggers
    where trigger_name = t.nombre
  ) then '✅ OK' else '❌ FALTA' end as estado
from (values
  ('on_auth_user_created'),
  ('profiles_set_updated_at'),
  ('bookings_set_updated_at'),
  ('profiles_protect_fields')
) as t(nombre);

-- 7. Funciones --------------------------------------------------
select
  f.nombre as funcion_esperada,
  case when exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = f.nombre
  ) then '✅ OK' else '❌ FALTA' end as estado
from (values
  ('handle_new_user'), ('generate_referral_code'), ('is_staff'),
  ('is_admin'), ('tier_for_visits'), ('set_updated_at'),
  ('protect_profile_fields'), ('redclub_diagnostics')
) as f(nombre);

-- 8. Vistas -----------------------------------------------------
select
  v.nombre as vista_esperada,
  case when exists (
    select 1 from pg_views where schemaname = 'public' and viewname = v.nombre
  ) then '✅ OK' else '❌ FALTA' end as estado
from (values ('member_points_balance'), ('club_member_summary')) as v(nombre);

-- 9. Catálogos sembrados ----------------------------------------
-- Con barbers vacío NINGUNA reserva se puede guardar:
-- bookings.barber_id tiene una llave foránea contra barbers.
select 'tiers'    as catalogo, count(*) as filas, 4  as esperado,
       case when count(*) >= 4  then '✅ OK' else '❌ Ejecuta 0004_seed.sql' end as estado
from public.tiers
union all
select 'barbers',  count(*), 2,
       case when count(*) >= 2  then '✅ OK' else '❌ Ejecuta 0004_seed.sql' end
from public.barbers
union all
select 'services', count(*), 21,
       case when count(*) >= 21 then '✅ OK' else '❌ Ejecuta 0004_seed.sql' end
from public.services;

-- 10. Políticas RLS por tabla -----------------------------------
select tablename as tabla, count(*) as politicas
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

-- 11. Estado de los datos ---------------------------------------
select
  (select count(*) from auth.users)               as usuarios,
  (select count(*) from public.profiles)          as perfiles,
  (select count(*) from public.bookings)          as reservas,
  (select count(*) from public.booking_services)  as servicios_reservados,
  (select count(*) from public.bookings where google_event_id is not null) as con_evento_calendar;
