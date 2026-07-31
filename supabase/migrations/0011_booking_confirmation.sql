-- ============================================================
-- RED CLUB — Fase 3 (Panel del barbero): confirmación de asistencia
-- ============================================================
-- completed_at ya existe (trigger set_booking_status_timestamps de la
-- 0008) y se sella solo. Pero "qué barbero confirmó la cita" no lo
-- puede saber un trigger: las escrituras de bookings las hace el
-- servidor con la service-role key, que no tiene un usuario asociado
-- (auth.uid() da null ahí). Por eso completed_by lo fija explícitamente
-- el endpoint que atiende el botón "Marcar como completada"
-- (api/staff/booking-status.ts), no un trigger.
--
-- Seguro de ejecutar varias veces. No borra nada.
-- ============================================================

alter table public.bookings
  add column if not exists completed_by uuid references public.profiles (id) on delete set null;

create index if not exists bookings_completed_by_idx on public.bookings (completed_by);

notify pgrst, 'reload schema';
