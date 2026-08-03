-- ============================================================
-- RED CLUB — Fase 4: otorgar puntos y sumar visita al completar
-- ============================================================
-- Hasta ahora, marcar una cita como "Completada" solo sellaba
-- completed_at/completed_by (Fase 3) — el sistema de puntos no estaba
-- implementado a propósito. Esta migración activa el enganche: cuando
-- una reserva CON CUENTA pasa a 'completed' por primera vez,
--   1. se otorgan POINTS_PER_VISIT puntos (ledger, nunca un contador
--      suelto — ver 0001), y
--   2. se suma 1 a profiles.visit_count (de donde ya se deriva el
--      nivel automáticamente, vía tier_for_visits desde la Fase 1).
--
-- Reservas de invitado (user_id null) no otorgan puntos: no hay cuenta
-- a la cual otorgárselos.
--
-- El índice único points_tx_one_per_booking_idx (0001) blinda contra
-- otorgar puntos dos veces por la misma reserva; el ON CONFLICT de
-- abajo lo respeta explícitamente.
--
-- Fuera de alcance a propósito (documentado, no una omisión): si una
-- cita se corrige de 'completed' a otro estado después, esta versión
-- NO revierte los puntos ni resta la visita. Ajustes manuales de
-- puntos son un panel futuro (reason='manual_adjustment' ya existe en
-- el enum para eso).
--
-- Seguro de ejecutar varias veces. No borra nada.
-- ============================================================

create or replace function public.award_points_on_completion()
returns trigger
language plpgsql
as $$
declare
  points_per_visit constant integer := 10;
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed'
     and new.user_id is not null then

    insert into public.points_transactions (user_id, amount, reason, description, booking_id)
    values (new.user_id, points_per_visit, 'booking_attended', 'Visita completada', new.id)
    on conflict (booking_id) where reason = 'booking_attended' and booking_id is not null
    do nothing;

    update public.profiles
      set visit_count = visit_count + 1
      where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_award_points on public.bookings;
create trigger bookings_award_points
  after update on public.bookings
  for each row execute function public.award_points_on_completion();

notify pgrst, 'reload schema';
