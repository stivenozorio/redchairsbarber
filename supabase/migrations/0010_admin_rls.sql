-- ============================================================
-- RED CLUB — Fase 2 (Panel administrativo): permisos de admin
-- ============================================================
-- Row Level Security para las tablas nuevas de horarios, y las
-- políticas que permiten al rol 'admin' administrar catálogos y
-- perfiles desde el panel. Sigue el mismo principio que el resto del
-- proyecto: RLS decide qué FILAS, pero Postgres también exige el
-- GRANT de tabla — sin él, el intento falla con "permission denied"
-- antes de que la política se evalúe (la misma lección de la
-- migración 0007).
--
-- Las reservas siguen sin tener política de escritura para nadie
-- desde el navegador, ni siquiera para admin: el cambio de estado de
-- una cita pasa por /api/admin/booking-status (service role), porque
-- cancelar también debe borrar el evento de Google Calendar — eso no
-- lo puede hacer una política de RLS.
--
-- Seguro de ejecutar varias veces.
-- ============================================================

alter table public.barber_schedules    enable row level security;
alter table public.schedule_exceptions enable row level security;

-- ------------------------------------------------------------
-- Horarios: lectura pública, escritura solo admin
-- ------------------------------------------------------------

drop policy if exists barber_schedules_select_all on public.barber_schedules;
create policy barber_schedules_select_all on public.barber_schedules
  for select using (true);

drop policy if exists barber_schedules_admin_insert on public.barber_schedules;
create policy barber_schedules_admin_insert on public.barber_schedules
  for insert with check (public.is_admin());

drop policy if exists barber_schedules_admin_update on public.barber_schedules;
create policy barber_schedules_admin_update on public.barber_schedules
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists schedule_exceptions_select_all on public.schedule_exceptions;
create policy schedule_exceptions_select_all on public.schedule_exceptions
  for select using (true);

drop policy if exists schedule_exceptions_admin_insert on public.schedule_exceptions;
create policy schedule_exceptions_admin_insert on public.schedule_exceptions
  for insert with check (public.is_admin());

drop policy if exists schedule_exceptions_admin_update on public.schedule_exceptions;
create policy schedule_exceptions_admin_update on public.schedule_exceptions
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists schedule_exceptions_admin_delete on public.schedule_exceptions;
create policy schedule_exceptions_admin_delete on public.schedule_exceptions
  for delete using (public.is_admin());

-- ------------------------------------------------------------
-- Catálogos: admin puede crear/editar (no borrar: barbers/services
-- están referenciados por reservas históricas; se desactivan con
-- `active = false`, nunca se eliminan).
-- ------------------------------------------------------------

drop policy if exists services_admin_insert on public.services;
create policy services_admin_insert on public.services
  for insert with check (public.is_admin());

drop policy if exists services_admin_update on public.services;
create policy services_admin_update on public.services
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists barbers_admin_insert on public.barbers;
create policy barbers_admin_insert on public.barbers
  for insert with check (public.is_admin());

drop policy if exists barbers_admin_update on public.barbers;
create policy barbers_admin_update on public.barbers
  for update using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- Perfiles: admin puede editar cualquiera (además de la política
-- existente que permite a cada quien editar el suyo). El trigger
-- protect_profile_fields (0002/0003) ya deja pasar a is_admin() para
-- los campos protegidos (role, visit_count, referral_code…).
-- ------------------------------------------------------------

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- Permisos de tabla (ver comentario del encabezado)
-- ------------------------------------------------------------

grant select on public.barber_schedules, public.schedule_exceptions to anon, authenticated;
grant insert, update on public.barber_schedules to authenticated;
grant insert, update, delete on public.schedule_exceptions to authenticated;

grant insert, update on public.services to authenticated;
grant insert, update on public.barbers to authenticated;
