import { getSupabaseAdmin } from "./supabaseAdmin.js";

export interface RedeemPointsResult {
  ok: boolean;
  newBalance: number | null;
  /** Mensaje seguro de mostrar al cliente (saldo insuficiente, etc.),
   * distinto de un error de infraestructura. */
  error: string | null;
}

/**
 * Descuenta puntos por canjear un servicio, de forma atómica y segura
 * contra doble gasto: llama a `redeem_points_for_booking()` (migración
 * 0019_points_redeem_functions.sql), que recalcula el saldo real DENTRO de
 * un bloqueo por usuario antes de insertar el descuento — nunca confía
 * en un saldo que el navegador haya calculado o mostrado antes.
 *
 * Debe llamarse justo después de crear la fila en `bookings` (con esa
 * reserva ya en estado 'pending'), y ANTES de tocar Google Calendar. Si
 * devuelve `ok: false`, el llamador debe descartar la reserva recién
 * creada (mismo patrón que cuando falla Calendar) y no continuar.
 */
export async function redeemPointsForBooking(
  userId: string,
  bookingId: string,
  points: number,
  description: string
): Promise<RedeemPointsResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, newBalance: null, error: "Supabase no está configurado." };
  }

  try {
    const { data, error } = await supabase
      .rpc("redeem_points_for_booking", {
        p_user_id: userId,
        p_booking_id: bookingId,
        p_points: points,
        p_description: description,
      })
      .single();

    if (error) {
      console.error("Error inesperado canjeando puntos:", error);
      return { ok: false, newBalance: null, error: "No se pudo procesar el canje de puntos." };
    }

    const result = data as { success: boolean; new_balance: number | null; error_message: string | null };
    return {
      ok: result.success,
      newBalance: result.new_balance,
      error: result.success ? null : (result.error_message ?? "Saldo de puntos insuficiente."),
    };
  } catch (error) {
    console.error("Error inesperado canjeando puntos:", error);
    return { ok: false, newBalance: null, error: "No se pudo procesar el canje de puntos." };
  }
}

/**
 * Descuenta puntos por un canje PRESENCIAL (el cliente pagó en la
 * barbería, no por /reservar) — lo inicia un administrador desde
 * `/admin/clientes`, no está atado a ninguna reserva de Supabase. Mismo
 * blindaje contra doble descuento que `redeemPointsForBooking`: llama a
 * `admin_redeem_points()` (migración 0021_admin_redeem_points.sql), que
 * recalcula el saldo real dentro de un bloqueo por usuario.
 */
export async function adminRedeemPoints(
  adminId: string,
  userId: string,
  points: number,
  description: string
): Promise<RedeemPointsResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, newBalance: null, error: "Supabase no está configurado." };
  }

  try {
    const { data, error } = await supabase
      .rpc("admin_redeem_points", {
        p_admin_id: adminId,
        p_user_id: userId,
        p_points: points,
        p_description: description,
      })
      .single();

    if (error) {
      console.error("Error inesperado en canje presencial de puntos:", error);
      return { ok: false, newBalance: null, error: "No se pudo procesar el canje de puntos." };
    }

    const result = data as { success: boolean; new_balance: number | null; error_message: string | null };
    return {
      ok: result.success,
      newBalance: result.new_balance,
      error: result.success ? null : (result.error_message ?? "Saldo de puntos insuficiente."),
    };
  } catch (error) {
    console.error("Error inesperado en canje presencial de puntos:", error);
    return { ok: false, newBalance: null, error: "No se pudo procesar el canje de puntos." };
  }
}

export interface RedeemProductResult {
  ok: boolean;
  newBalance: number | null;
  redemptionId: string | null;
  error: string | null;
}

/**
 * Canje de un PRODUCTO en línea, iniciado por el propio cliente desde
 * /productos — sin pasar por el mostrador. Llama a
 * `redeem_product_for_points()` (migración 0025_product_redemptions.sql),
 * mismo blindaje de siempre (bloqueo por usuario, saldo recalculado
 * dentro del bloqueo). Deja una fila en `reward_redemptions` con
 * status 'pending': el producto queda pendiente de entregar en el
 * local, no se envía a ningún lado.
 */
export async function redeemProductForPoints(
  userId: string,
  productId: string
): Promise<RedeemProductResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, newBalance: null, redemptionId: null, error: "Supabase no está configurado." };
  }

  try {
    const { data, error } = await supabase
      .rpc("redeem_product_for_points", { p_user_id: userId, p_product_id: productId })
      .single();

    if (error) {
      console.error("Error inesperado canjeando un producto:", error);
      return { ok: false, newBalance: null, redemptionId: null, error: "No se pudo procesar el canje." };
    }

    const result = data as {
      success: boolean;
      new_balance: number | null;
      error_message: string | null;
      redemption_id: string | null;
    };
    return {
      ok: result.success,
      newBalance: result.new_balance,
      redemptionId: result.redemption_id,
      error: result.success ? null : (result.error_message ?? "Saldo de puntos insuficiente."),
    };
  } catch (error) {
    console.error("Error inesperado canjeando un producto:", error);
    return { ok: false, newBalance: null, redemptionId: null, error: "No se pudo procesar el canje." };
  }
}

export interface RedemptionActionResult {
  ok: boolean;
  error: string | null;
}

/** Un miembro del staff (barbero o admin) confirma que el cliente ya
 * recogió su producto canjeado. No toca puntos. */
export async function fulfillProductRedemption(
  staffId: string,
  redemptionId: string
): Promise<RedemptionActionResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Supabase no está configurado." };

  try {
    const { data, error } = await supabase
      .rpc("fulfill_product_redemption", { p_staff_id: staffId, p_redemption_id: redemptionId })
      .single();

    if (error) {
      console.error("Error inesperado marcando un canje como entregado:", error);
      return { ok: false, error: "No se pudo registrar la entrega." };
    }
    const result = data as { success: boolean; error_message: string | null };
    return {
      ok: result.success,
      error: result.success ? null : (result.error_message ?? "No se pudo registrar la entrega."),
    };
  } catch (error) {
    console.error("Error inesperado marcando un canje como entregado:", error);
    return { ok: false, error: "No se pudo registrar la entrega." };
  }
}

/** Solo un administrador: cancela un canje de producto pendiente y le
 * devuelve los puntos al cliente (reason 'redemption_refund', mismo
 * patrón que una reserva canjeada que se cancela). */
export async function cancelProductRedemption(
  adminId: string,
  redemptionId: string
): Promise<RedemptionActionResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "Supabase no está configurado." };

  try {
    const { data, error } = await supabase
      .rpc("cancel_product_redemption", { p_admin_id: adminId, p_redemption_id: redemptionId })
      .single();

    if (error) {
      console.error("Error inesperado cancelando un canje de producto:", error);
      return { ok: false, error: "No se pudo cancelar el canje." };
    }
    const result = data as { success: boolean; error_message: string | null };
    return {
      ok: result.success,
      error: result.success ? null : (result.error_message ?? "No se pudo cancelar el canje."),
    };
  } catch (error) {
    console.error("Error inesperado cancelando un canje de producto:", error);
    return { ok: false, error: "No se pudo cancelar el canje." };
  }
}
