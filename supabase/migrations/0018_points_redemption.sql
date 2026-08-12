-- ============================================================
-- RED CLUB — Canje de servicios con puntos
-- ============================================================
-- Permite pagar UNA reserva de UN solo servicio con puntos en vez de
-- efectivo. No toca ni recalcula ningún punto ya otorgado ni ninguna
-- fila existente de points_transactions/booking_services: solo agrega
-- comportamiento nuevo hacia adelante.
--
-- Tasa de canje: 1 punto = $300 COP, piso(precio / 300) — deliberada-
-- mente distinta de la tasa con la que se GANAN puntos (piso(precio /
-- 2000), migración 0017). Son dos fórmulas independientes: una decide
-- cuánto cuesta canjear, la otra cuánto se gana al completar una cita.
--
-- Por qué el canje es de un solo servicio por reserva: booking_services
-- no tiene (ni necesita) un concepto de "método de pago por línea" —
-- el precio siempre ha sido de la reserva completa. Soportar canjes
-- parciales de una reserva con varios servicios requeriría una columna
-- nueva ahí y prorratear el otorgamiento/reembolso por línea, sin que
-- ningún caso de uso real lo pida todavía. Si un cliente quiere
-- canjear un servicio y pagar otro en efectivo, son dos reservas.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Nuevo motivo del ledger: reembolso de un canje cancelado
-- ------------------------------------------------------------
-- ADD VALUE no se puede usar en la misma transacción en la que se
-- consulta el valor nuevo (ver 0008), así que va primero y sola. Se usa
-- más abajo solo dentro de cuerpos de función (texto, no se ejecuta
-- todavía en esta migración), así que es seguro.

alter type public.points_reason add value if not exists 'redemption_refund';

-- ------------------------------------------------------------
-- 2. Columnas nuevas en bookings
-- ------------------------------------------------------------

alter table public.bookings
  add column if not exists redeemed_with_points boolean not null default false,
  add column if not exists points_redeemed integer;

do $$ begin
  alter table public.bookings
    add constraint bookings_points_redeemed_consistent
    check (
      (redeemed_with_points and points_redeemed is not null and points_redeemed > 0)
      or (not redeemed_with_points and points_redeemed is null)
    );
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 3. Protección contra doble canje/doble reembolso a nivel de índice
-- ------------------------------------------------------------
-- Mismo patrón que points_tx_one_per_booking_idx (0001) para el
-- otorgamiento por visita: como mucho una fila de cada motivo por
-- reserva. No debería poderse violar nunca con el flujo normal (cada
-- llamada a redeem_points_for_booking va atada a una reserva recién
-- creada), pero sirve de respaldo si algo llegara a llamarla dos veces.

create unique index if not exists points_tx_one_redemption_per_booking_idx
  on public.points_transactions (booking_id)
  where reason = 'reward_redemption' and booking_id is not null;

create unique index if not exists points_tx_one_refund_per_booking_idx
  on public.points_transactions (booking_id)
  where reason = 'redemption_refund' and booking_id is not null;

-- ------------------------------------------------------------
-- 4. Descuento atómico y seguro contra doble gasto
-- ------------------------------------------------------------
-- Se llama desde api/book.ts justo después de crear la fila en
-- bookings (antes de tocar Google Calendar). Nunca se llama desde el
-- navegador: solo la service-role key tiene EXECUTE (ver el revoke/
-- grant más abajo).
--
-- pg_advisory_xact_lock serializa cualquier llamada concurrente para
-- el MISMO usuario: si dos peticiones llegan casi al mismo tiempo (un
-- doble clic en "Canjear"), la segunda espera a que la primera termine
-- su transacción antes de poder siquiera leer el saldo. Así el saldo
-- que se recalcula adentro del bloqueo ya refleja el descuento de la
-- primera, y la segunda se rechaza si ya no alcanza — nunca las dos
-- pueden pasar la validación con el mismo saldo "viejo".

create or replace function public.redeem_points_for_booking(
  p_user_id uuid,
  p_booking_id uuid,
  p_points integer,
  p_description text
)
returns table(success boolean, new_balance integer, error_message text)
language plpgsql
as $$
declare
  v_balance integer;
begin
  if p_points is null or p_points <= 0 then
    return query select false, null::integer, 'El costo en puntos debe ser mayor a cero.';
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(amount), 0) into v_balance
    from public.points_transactions
    where user_id = p_user_id;

  if v_balance < p_points then
    return query select false, v_balance, 'Saldo de puntos insuficiente.';
    return;
  end if;

  insert into public.points_transactions (user_id, amount, reason, description, booking_id)
  values (p_user_id, -p_points, 'reward_redemption', p_description, p_booking_id);

  return query select true, (v_balance - p_points), null::text;
end;
$$;

revoke all on function public.redeem_points_for_booking(uuid, uuid, integer, text) from public;
grant execute on function public.redeem_points_for_booking(uuid, uuid, integer, text) to service_role;

-- ------------------------------------------------------------
-- 5. Una reserva canjeada, al completarse, NO otorga los puntos
--    normales del servicio (pero SÍ sigue sumando la visita)
-- ------------------------------------------------------------
-- Mismo cuerpo que 0017 (award_points_on_completion), con el único
-- cambio de envolver el otorgamiento (no la suma de visita) en
-- "not new.redeemed_with_points". Los puntos y las visitas son
-- conceptos distintos: una cita canjeada completada sigue contando
-- como visita para efectos de nivel (BLACK/RED/GOLD/LEGEND), solo que
-- no genera puntos nuevos además del canje que ya se hizo al reservar.

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

    if not new.redeemed_with_points then
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
    end if;

    update public.profiles
      set visit_count = visit_count + 1
      where id = new.user_id;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 6. Si una reserva canjeada se cancela, devolver los puntos
-- ------------------------------------------------------------
-- Trigger nuevo (no se modifica bookings_set_status_timestamps ni
-- bookings_award_points): se dispara sin importar si la cancelación
-- vino de /api/cancel (autoservicio del cliente) o de
-- /api/staff/booking-status.ts (panel admin/barbero) — ambos caminos
-- terminan en el mismo UPDATE de bookings.status, así que un trigger de
-- base de datos es el único lugar que cubre los dos sin duplicar
-- lógica en dos archivos de TypeScript distintos.

create or replace function public.refund_points_on_cancellation()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'cancelled'
     and old.status is distinct from 'cancelled'
     and new.redeemed_with_points
     and new.points_redeemed is not null
     and new.points_redeemed > 0
     and new.user_id is not null then

    insert into public.points_transactions (user_id, amount, reason, description, booking_id)
    values (
      new.user_id,
      new.points_redeemed,
      'redemption_refund',
      'Reembolso por cancelación de canje',
      new.id
    )
    on conflict (booking_id) where reason = 'redemption_refund' and booking_id is not null
    do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_refund_points on public.bookings;
create trigger bookings_refund_points
  after update on public.bookings
  for each row execute function public.refund_points_on_cancellation();

notify pgrst, 'reload schema';
