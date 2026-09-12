-- ============================================================
-- RED CLUB — Canje de productos EN LÍNEA (Fase 4, ajuste)
-- ============================================================
-- Hasta ahora el canje de un producto solo pasaba por el mostrador
-- (admin_redeem_points, 0021). A pedido explícito del dueño del
-- negocio ("siempre tenemos existencias") se agrega el canje 100% en
-- línea desde /productos: el cliente descuenta sus propios puntos sin
-- que nadie del local lo confirme antes. Sin control de inventario,
-- este es un riesgo aceptado a propósito (no impuesto por el sistema),
-- no un descuido — quedó documentado y confirmado con el cliente antes
-- de construirlo.
--
-- Reutiliza `reward_redemptions` (Fase 5, ya en el esquema desde 0001,
-- pensada exactamente para "algo que se canjea con puntos y se recoge
-- después") en vez de crear una tabla paralela: se le agrega
-- `product_id` (antes solo admitía `reward_id`, de un catálogo
-- `rewards` que nunca se llegó a usar). Un check garantiza que cada
-- fila apunte a EXACTAMENTE una de las dos cosas.
--
-- Flujo:
--   1. Cliente canjea desde /productos -> redeem_product_for_points()
--      -> descuenta puntos (mismo blindaje de siempre: bloqueo por
--      usuario, saldo recalculado dentro del bloqueo) y crea la fila
--      en reward_redemptions con status 'pending'.
--   2. Cliente pasa por el local a recoger el producto -> el staff
--      (barbero o admin) lo marca con fulfill_product_redemption().
--   3. Si el cliente no lo recoge o se arrepiente, un ADMIN (no
--      cualquier barbero) puede cancelar y devolver los puntos con
--      cancel_product_redemption() — mismo motivo 'redemption_refund'
--      que ya existe para reservas canjeadas canceladas (0019).
--
-- Ninguna de las tres funciones se llama desde el navegador
-- directamente: solo la service-role key (los tres endpoints nuevos en
-- api/redeem-product.ts y api/staff/*.ts la verifican antes de
-- invocarlas).
--
-- Seguro de ejecutar varias veces. No borra ni pisa nada existente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. reward_redemptions ahora también admite un producto
-- ------------------------------------------------------------

alter table public.reward_redemptions
  alter column reward_id drop not null,
  add column if not exists product_id uuid references public.products (id);

do $$ begin
  alter table public.reward_redemptions
    add constraint reward_redemptions_target_check
    check (
      (reward_id is not null and product_id is null)
      or (reward_id is null and product_id is not null)
    );
exception when duplicate_object then null; end $$;

-- Blindaje adicional contra doble reembolso — mismo patrón que
-- points_tx_one_refund_per_booking_idx (0019), pero por canje en vez
-- de por reserva.
create unique index if not exists points_tx_one_refund_per_redemption_idx
  on public.points_transactions (redemption_id)
  where reason = 'redemption_refund' and redemption_id is not null;

-- ------------------------------------------------------------
-- 2. Canje: el cliente descuenta sus propios puntos
-- ------------------------------------------------------------

create or replace function public.redeem_product_for_points(
  p_user_id uuid,
  p_product_id uuid
)
returns table(success boolean, new_balance integer, error_message text, redemption_id uuid)
language plpgsql
as $$
declare
  v_balance integer;
  v_points_cost integer;
  v_name text;
  v_active boolean;
  v_redemption_id uuid;
begin
  select points_cost, name, active into v_points_cost, v_name, v_active
    from public.products
    where id = p_product_id;

  if not found or not v_active then
    return query select false, null::integer, 'Este producto ya no está disponible.', null::uuid;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(amount), 0) into v_balance
    from public.points_transactions
    where user_id = p_user_id;

  if v_balance < v_points_cost then
    return query select false, v_balance, 'Saldo de puntos insuficiente.', null::uuid;
    return;
  end if;

  insert into public.reward_redemptions (user_id, product_id, points_spent, status)
  values (p_user_id, p_product_id, v_points_cost, 'pending')
  returning id into v_redemption_id;

  insert into public.points_transactions (user_id, amount, reason, description, redemption_id)
  values (p_user_id, -v_points_cost, 'reward_redemption', 'Canje en línea — ' || v_name, v_redemption_id);

  return query select true, (v_balance - v_points_cost), null::text, v_redemption_id;
end;
$$;

revoke all on function public.redeem_product_for_points(uuid, uuid) from public;
grant execute on function public.redeem_product_for_points(uuid, uuid) to service_role;

-- ------------------------------------------------------------
-- 3. Entregado: el staff confirma que el cliente ya lo recogió
-- ------------------------------------------------------------
-- No toca puntos — por eso puede hacerlo cualquier barbero, no solo un
-- admin (a diferencia de cancelar, que sí devuelve puntos).

create or replace function public.fulfill_product_redemption(
  p_staff_id uuid,
  p_redemption_id uuid
)
returns table(success boolean, error_message text)
language plpgsql
as $$
begin
  update public.reward_redemptions
    set status = 'fulfilled', fulfilled_by = p_staff_id, fulfilled_at = now()
    where id = p_redemption_id and status = 'pending' and product_id is not null;

  if not found then
    return query select false, 'Ese canje ya fue entregado o cancelado.';
    return;
  end if;

  return query select true, null::text;
end;
$$;

revoke all on function public.fulfill_product_redemption(uuid, uuid) from public;
grant execute on function public.fulfill_product_redemption(uuid, uuid) to service_role;

-- ------------------------------------------------------------
-- 4. Cancelar y devolver puntos (solo admin)
-- ------------------------------------------------------------
-- update ... where status = 'pending' ... returning es el blindaje
-- contra doble reembolso por dos clics casi simultáneos: solo una
-- llamada puede "ganar" la fila (la segunda encuentra status ya
-- distinto y no actualiza nada).

create or replace function public.cancel_product_redemption(
  p_admin_id uuid,
  p_redemption_id uuid
)
returns table(success boolean, error_message text)
language plpgsql
as $$
declare
  v_user_id uuid;
  v_points_spent integer;
  v_product_name text;
begin
  update public.reward_redemptions
    set status = 'cancelled', fulfilled_by = p_admin_id, fulfilled_at = now()
    where id = p_redemption_id and status = 'pending' and product_id is not null
    returning user_id, points_spent into v_user_id, v_points_spent;

  if not found then
    return query select false, 'Ese canje ya fue entregado o cancelado.';
    return;
  end if;

  select p.name into v_product_name
    from public.products p
    join public.reward_redemptions rr on rr.product_id = p.id
    where rr.id = p_redemption_id;

  insert into public.points_transactions (user_id, amount, reason, description, redemption_id)
  values (
    v_user_id,
    v_points_spent,
    'redemption_refund',
    'Reembolso — canje cancelado' || coalesce(' (' || v_product_name || ')', ''),
    p_redemption_id
  );

  return query select true, null::text;
end;
$$;

revoke all on function public.cancel_product_redemption(uuid, uuid) from public;
grant execute on function public.cancel_product_redemption(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
