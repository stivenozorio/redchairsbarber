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
 * 0018_points_redemption.sql), que recalcula el saldo real DENTRO de
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
