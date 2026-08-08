-- ============================================================
-- RED CLUB — corrige el otorgamiento de puntos: por servicio, no fijo
-- ============================================================
-- Antes (0013): toda cita completada otorgaba siempre 10 puntos fijos,
-- sin importar el servicio realizado. Esta migración corrige la
-- fórmula para que otorgue puntos según el (o los) servicio(s) que
-- realmente incluyó la reserva:
--
--   puntos_de_una_línea = piso(price_cop_snapshot / 2000)
--
-- Esta fórmula reproduce exacto la tabla oficial de puntos del
-- programa (Corte Sencillo $20.000 -> 10, Recorte de Barba Sencillo
-- $10.000 -> 5, Afeitado $15.000 -> 7, ... Experiencia VIP + Barba +
-- Cejas $81.000 -> 40 — los 21 servicios y combos actuales del
-- catálogo caen exactos con este cálculo), y de paso queda automática
-- para cuando el catálogo cambie de precios o se agreguen servicios
-- nuevos, sin necesitar mantener a mano una tabla de mapeo aparte que
-- se pueda desincronizar de precios.

-- Cuando una reserva combina varios servicios (booking_services tiene
-- más de una fila, ej. Corte + Afeitado por separado), se suman los
-- puntos de cada línea — antes se otorgaban 10 puntos fijos sin
-- importar cuántos servicios se hubieran realizado en esa cita.
--
-- IMPORTANTE — puntos ya otorgados: esta migración SOLO cambia hacia
-- adelante el cálculo que hace el trigger. No modifica, borra ni
-- recalcula ninguna fila existente de points_transactions ni de
-- profiles.visit_count: el saldo histórico de cada cliente queda
-- exactamente igual que antes de correr esto. El índice único
-- points_tx_one_per_booking_idx (0001) sigue impidiendo otorgar puntos
-- dos veces por la misma reserva, así que una cita que ya haya sido
-- completada (y ya haya otorgado sus 10 puntos fijos bajo la regla
-- vieja) NO se vuelve a tocar aunque su estado cambie de nuevo a
-- 'completed' más adelante.
--
-- Si una reserva llegara a completarse sin ninguna fila en
-- booking_services (no debería pasar con el flujo actual, pero por si
-- acaso con datos antiguos), no se otorgan puntos para esa cita
-- puntual (el ledger no permite montos en cero) pero la visita sí se
-- sigue contando en profiles.visit_count igual que antes.
--
-- Seguro de ejecutar varias veces. No borra nada.
-- ============================================================

create or replace function public.award_points_on_completion()
returns trigger
language plpgsql
as $$
declare
  total_points integer;
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed'
     and new.user_id is not null then

    -- División entera de dos integers en Postgres trunca hacia cero,
    -- que para valores positivos es exactamente "piso" (floor).
    select coalesce(sum(price_cop_snapshot / 2000), 0)
      into total_points
      from public.booking_services
      where booking_id = new.id;

    if total_points > 0 then
      insert into public.points_transactions (user_id, amount, reason, description, booking_id)
      values (new.user_id, total_points, 'booking_attended', 'Visita completada', new.id)
      on conflict (booking_id) where reason = 'booking_attended' and booking_id is not null
      do nothing;
    end if;

    update public.profiles
      set visit_count = visit_count + 1
      where id = new.user_id;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
