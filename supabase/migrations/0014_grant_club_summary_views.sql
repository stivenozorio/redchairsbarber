-- ============================================================
-- RED CLUB — corrige permiso faltante sobre las vistas de socio
-- ============================================================
-- Mismo bug que 0007 (permisos de tabla), pero en una vista: RLS con
-- security_invoker = true hace que member_points_balance/
-- club_member_summary respeten las políticas de las tablas que
-- consultan por debajo, pero la VISTA es su propio objeto en Postgres
-- y necesita su propio GRANT SELECT — nunca se otorgó desde que se
-- crearon en 0002_functions.sql.
--
-- Sin este grant, el navegador recibe "permission denied for view
-- club_member_summary" al consultarla. La tarjeta digital de Fase 4
-- (src/components/club/DigitalCard.tsx) se degrada en silencio ante
-- cualquier error, así que el síntoma era: el trigger de puntos sí
-- corría (visit_count/points_transactions se actualizaban en la base),
-- pero la tarjeta nunca se mostraba en "Mi cuenta".
--
-- Seguro de ejecutar varias veces. No borra nada.
-- ============================================================

grant select on public.member_points_balance, public.club_member_summary
to authenticated;

notify pgrst, 'reload schema';
