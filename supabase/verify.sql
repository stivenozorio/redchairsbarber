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
  ('reward_redemptions'), ('referrals'), ('memberships'),
  ('barber_schedules'), ('schedule_exceptions'), ('calendar_sync_errors')
) as t(nombre)
left join pg_class c
  on c.relname = t.nombre
 and c.relnamespace = 'public'::regnamespace
 and c.relkind = 'r'
order by t.nombre;

-- 1b. Permisos de tabla para service_role ------------------------
-- RLS solo filtra filas; sin este GRANT, Postgres responde
-- "permission denied for table X" antes de mirar la política.
select
  t.nombre as tabla,
  case when has_table_privilege('service_role', 'public.' || t.nombre, 'SELECT')
    then '✅ OK' else '❌ Ejecuta 0007_grant_table_privileges.sql' end as estado
from (values
  ('profiles'), ('barbers'), ('services'), ('tiers'), ('bookings'),
  ('booking_services'), ('points_transactions'), ('rewards'),
  ('reward_redemptions'), ('referrals'), ('memberships')
) as t(nombre)
order by t.nombre;

-- 1c. Estados de cita disponibles (Fase 2: panel administrativo) ---
select
  unnest(enum_range(null::booking_status))::text as estado_disponible;

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
  ('profiles_protect_fields'),
  ('bookings_set_status_timestamps'),
  ('barbers_seed_default_schedule'),
  ('bookings_award_points')
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
  ('protect_profile_fields'), ('redclub_diagnostics'),
  ('set_booking_status_timestamps'), ('seed_default_barber_schedule'),
  ('award_points_on_completion')
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
from public.services
union all
select 'barber_schedules', count(*), (select count(*) * 7 from public.barbers),
       case when count(*) >= (select count(*) * 7 from public.barbers) then '✅ OK'
            else '❌ Ejecuta 0009_schedules.sql' end
from public.barber_schedules;

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

-- 12. Columna de confirmación de asistencia (Fase 3) -------------
select
  case when exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings' and column_name = 'completed_by'
  ) then '✅ OK' else '❌ Ejecuta 0011_booking_confirmation.sql' end as estado,
  'bookings.completed_by' as columna;

-- 13. Personal con acceso al panel del barbero (Fase 3) ----------
-- Para que un barbero pueda entrar a /barbero necesita role='barber'
-- en profiles Y una fila en barbers con user_id apuntando a su cuenta.
-- Ver README (sección "Panel del barbero") para el SQL exacto.
select
  b.id as barbero,
  b.name as nombre,
  p.email as cuenta_vinculada,
  case when p.role = 'barber' then '✅ OK'
       when p.role is null then '⚠️ Sin cuenta vinculada'
       else '⚠️ La cuenta vinculada no tiene role=barber (tiene: ' || p.role::text || ')' end as estado
from public.barbers b
left join public.profiles p on p.id = b.user_id
order by b.sort_order;

-- 14. Reservas canceladas cuyo evento de Calendar no se pudo liberar
-- (Fase 3, ajuste) — lo que un futuro panel administrativo listaría
-- para corregir a mano. Vacío = todo sincronizado.
select
  e.id, e.booking_id, e.barber_id, e.google_event_id, e.error_message, e.created_at
from public.calendar_sync_errors e
where not e.resolved
order by e.created_at desc;

-- 15. Puntos y niveles (Fase 4) -----------------------------------
-- Citas completadas CON cuenta que todavía no otorgaron puntos: debe
-- estar vacío si el trigger bookings_award_points está activo.
select
  b.id as reserva, b.user_id, b.status, b.completed_by
from public.bookings b
where b.status = 'completed'
  and b.user_id is not null
  and not exists (
    select 1 from public.points_transactions pt
    where pt.booking_id = b.id and pt.reason = 'booking_attended'
  );

-- Resumen de socios (nivel + puntos ya calculados vía club_member_summary).
select user_id, full_name, visit_count, points_balance, tier_id, tier_name
from public.club_member_summary
order by points_balance desc;

-- Permiso de tabla sobre las vistas de socio para 'authenticated' ------
-- Sin esto, el navegador recibe "permission denied for view X" al
-- consultarla y la tarjeta digital de Mi Cuenta no muestra nada.
select
  v.nombre as vista,
  case when has_table_privilege('authenticated', 'public.' || v.nombre, 'SELECT')
    then '✅ OK' else '❌ Ejecuta 0014_grant_club_summary_views.sql' end as estado
from (values ('member_points_balance'), ('club_member_summary')) as v(nombre);

-- 16. Cumpleaños de socios (Fase 4, ajuste) -------------------------
-- club_member_summary ya expone birthday (0015): quiénes cumplen años
-- ESTE MES, para saber a quién dar el premio de cumpleaños (el canje
-- en sí es Fase 5 — points_reason ya tiene 'birthday_bonus' reservado
-- para eso). Se compara solo el mes (no un rango de 30 días) para no
-- tener que lidiar con el cruce de fin de año en la consulta.
select
  user_id, full_name, phone, birthday
from public.club_member_summary
where birthday is not null
  and extract(month from birthday) = extract(month from current_date)
order by extract(day from birthday);

-- 17. Horarios bloqueados por los barberos (Fase 4, ajuste) ---------
-- Bloqueos activos (source = 'blocked', sin cancelar): horarios que un
-- barbero reservó para un cliente presencial y que ya no se ofrecen en
-- la reserva en línea. Ver api/staff/block-slot.ts.
select
  b.id, b.barber_id, b.starts_at, b.ends_at, b.notes
from public.bookings b
where b.source = 'blocked' and b.status <> 'cancelled'
order by b.starts_at;
