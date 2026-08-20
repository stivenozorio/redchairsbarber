-- ============================================================
-- RED CLUB — 0020: concede a service_role el permiso que faltaba
-- sobre barber_schedules y schedule_exceptions
-- ============================================================
-- Misma lección que 0006/0007 (RLS solo filtra FILAS; sin el GRANT de
-- tabla, Postgres responde "permission denied for table X" antes de
-- evaluar la política) pero repetida en dos tablas MÁS NUEVAS: 0009
-- creó barber_schedules y schedule_exceptions, y 0010 les puso RLS con
-- política de lectura pública (`for select using (true)`) y le
-- concedió SELECT a anon/authenticated — pero nunca a service_role, el
-- rol que de verdad usa el servidor (api/_lib/scheduleRepo.ts,
-- api/staff/day-off.ts).
--
-- Efecto real en producción, confirmado con /api/schedule-debug: toda
-- consulta a estas dos tablas desde el servidor fallaba con
-- "permission denied", así que getEffectiveHours() caía siempre al
-- horario fijo de respaldo (10am-9pm, TODOS los días, incluido
-- domingo) sin importar lo que dijera barber_schedules.is_open — y
-- api/staff/day-off.ts (bloquear un día completo desde el panel del
-- barbero) tampoco podía escribir en schedule_exceptions.
--
-- Seguro de ejecutar varias veces.
-- ============================================================

grant select, insert, update, delete on
  public.barber_schedules,
  public.schedule_exceptions
to service_role;

notify pgrst, 'reload schema';
