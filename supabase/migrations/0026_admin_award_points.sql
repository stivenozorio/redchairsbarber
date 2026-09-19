-- ============================================================
-- RED CLUB — Asignación manual de puntos (admin)
-- ============================================================
-- Caso real que la motivó: un concurso (ej. Instagram) cuyo ganador no
-- tenía cuenta en RED CLUB. Se le pide crear una y, ya con su
-- `user_id`, un administrador le carga los puntos del premio a mano
-- desde /admin/clientes — sin que haya reserva, canje ni compra detrás.
--
-- Es la operación inversa de admin_redeem_points() (0021): en vez de
-- restar, SUMA. Reutiliza el motivo 'manual_adjustment' (existe desde
-- 0001, pensado exactamente para esto) en vez de uno nuevo, para que
-- quede claro en el historial que no es un canje ni una visita.
--
-- No hace falta comprobar saldo (sumar nunca puede dejarlo en
-- negativo), pero sí se usa el mismo bloqueo por usuario que el resto
-- de las funciones de puntos para que el `new_balance` devuelto sea
-- siempre el real, incluso si hay otro movimiento en paralelo.
--
-- Seguro de ejecutar varias veces. No borra nada.
-- ============================================================

create or replace function public.admin_award_points(
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
    return query select false, null::integer, 'Los puntos a asignar deben ser mayores a cero.';
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  insert into public.points_transactions (user_id, amount, reason, description, booking_id, created_by)
  values (p_user_id, p_points, 'manual_adjustment', p_description, null, p_admin_id);

  select coalesce(sum(amount), 0) into v_balance
    from public.points_transactions
    where user_id = p_user_id;

  return query select true, v_balance, null::text;
end;
$$;

-- Nunca se llama desde el navegador, ni siquiera con sesión de admin:
-- solo la service-role key (api/staff/redeem-points.ts, action:
-- "award"), que ya verificó el rol del que llama antes de invocar esto.
revoke all on function public.admin_award_points(uuid, uuid, integer, text) from public;
grant execute on function public.admin_award_points(uuid, uuid, integer, text) to service_role;

notify pgrst, 'reload schema';
