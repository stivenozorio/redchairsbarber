-- ============================================================
-- RED CLUB — 0007: concede los permisos de tabla que faltaban
-- ============================================================
-- 0003_rls.sql habilitó Row Level Security y creó las políticas, pero
-- nunca concedió el permiso base de tabla a anon/authenticated/
-- service_role. RLS solo filtra FILAS; sin el GRANT de tabla, Postgres
-- responde "permission denied for table X" antes de mirar siquiera la
-- política — exactamente el error que reportó /api/health para las 11
-- tablas con service_role, y la causa más probable de que "Mi cuenta"
-- no pudiera leer las reservas del cliente autenticado tampoco.
--
-- Seguro de ejecutar varias veces: solo concede permisos, no crea ni
-- borra nada. Si ya ejecutaste la versión actualizada de
-- 0003_rls.sql (que ya incluye estos GRANT), este archivo es
-- redundante pero inofensivo.
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on
  public.profiles,
  public.barbers,
  public.services,
  public.tiers,
  public.bookings,
  public.booking_services,
  public.points_transactions,
  public.rewards,
  public.reward_redemptions,
  public.referrals,
  public.memberships
to service_role;

grant select on
  public.barbers,
  public.services,
  public.tiers,
  public.rewards
to anon, authenticated;

grant select on
  public.bookings,
  public.booking_services,
  public.points_transactions,
  public.reward_redemptions,
  public.referrals,
  public.memberships
to authenticated;

grant select, update on public.profiles to authenticated;
