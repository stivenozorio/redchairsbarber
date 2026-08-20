-- ============================================================
-- RED CLUB — Canje de puntos presencial (admin)
-- ============================================================
-- Un cliente puede llegar a la barbería y pedir pagar con puntos SIN
-- pasar por /reservar (ej. ya se le hizo el corte, o prefiere que se
-- lo registren directo). Este canje NO está atado a ninguna reserva
-- de Supabase — a diferencia de redeem_points_for_booking() (0019),
-- que descuenta puntos como parte de crear una reserva en línea, esto
-- es un descuento manual e inmediato que solo un administrador puede
-- iniciar, desde /admin/clientes.
--
-- Reutiliza el mismo motivo 'reward_redemption' (no uno nuevo) para
-- que aparezca igual en el historial de puntos del cliente ("Canje de
-- puntos") sin importar si fue en línea o presencial — la diferencia
-- queda en la descripción y en booking_id (null aquí) / created_by
-- (el admin que lo registró, columna que ya existía desde 0001
-- pensada exactamente para esto: "qué usuario del staff lo registró").
--
-- Mismo blindaje contra doble descuento que redeem_points_for_booking:
-- bloqueo por usuario (pg_advisory_xact_lock) y el saldo se recalcula
-- DENTRO del bloqueo, nunca se confía en un saldo que haya mandado el
-- navegador.
--
-- Seguro de ejecutar varias veces. No borra nada.
-- ============================================================

create or replace function public.admin_redeem_points(
  p_admin_id uuid,
  p_user_id uuid,
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

  insert into public.points_transactions (user_id, amount, reason, description, booking_id, created_by)
  values (p_user_id, -p_points, 'reward_redemption', p_description, null, p_admin_id);

  return query select true, (v_balance - p_points), null::text;
end;
$$;

-- Nunca se llama desde el navegador, ni siquiera con sesión de admin:
-- solo la service-role key (api/admin/redeem-points.ts), que ya
-- verificó el rol del que llama antes de invocar esto.
revoke all on function public.admin_redeem_points(uuid, uuid, integer, text) from public;
grant execute on function public.admin_redeem_points(uuid, uuid, integer, text) to service_role;

notify pgrst, 'reload schema';
