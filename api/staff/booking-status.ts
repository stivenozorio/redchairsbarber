import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireStaffUserId, StaffAuthError } from "../_lib/auth.js";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin.js";
import { sendApiError } from "../_lib/http.js";
import { InvalidScheduleInputError } from "../_lib/schedule.js";

/**
 * Cambia el estado de una reserva desde el panel administrativo o el
 * panel del barbero. Lo usan ambos: un admin puede tocar cualquier
 * reserva; un barbero solo las suyas (se resuelve su barbers.id vía
 * barbers.user_id — ver requireStaffUserId).
 *
 * A propósito, este endpoint NUNCA toca Google Calendar: un cambio de
 * estado (incluida "Cancelada") es solo información interna de
 * seguimiento operativo. Si de verdad se necesita liberar el horario en
 * el calendario del barbero, eso sigue siendo una acción aparte
 * (api/cancel.ts, la que usa el propio cliente).
 *
 * Cuando el nuevo estado es 'completed':
 *   - el trigger set_booking_status_timestamps (0008) sella
 *     completed_at automáticamente.
 *   - este endpoint graba completed_by con quién lo confirmó (no lo
 *     puede hacer un trigger: las escrituras van con la service-role
 *     key, que no tiene un usuario de sesión asociado).
 * Ninguno de los dos otorga puntos ni suma visitas todavía — eso es
 * Fase 4. Este es exactamente el enganche que esa fase usará.
 */

const VALID_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "no_show",
  "cancelled",
] as const;
type BookingStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (VALID_STATUSES as readonly string[]).includes(value);
}

interface RequestBody {
  bookingId?: string;
  status?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const identity = await requireStaffUserId(req);

    const { bookingId, status } = (req.body ?? {}) as RequestBody;
    if (!bookingId || typeof bookingId !== "string") {
      throw new InvalidScheduleInputError("El campo 'bookingId' es requerido.");
    }
    if (!isValidStatus(status)) {
      throw new InvalidScheduleInputError(
        `Estado inválido: '${status}'. Debe ser uno de: ${VALID_STATUSES.join(", ")}.`
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      res.status(500).json({ error: "Supabase no está configurado." });
      return;
    }

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, barber_id, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchError || !booking) {
      res.status(404).json({ error: "No se encontró la reserva." });
      return;
    }

    if (identity.role === "barber") {
      if (!identity.barberId) {
        throw new StaffAuthError(
          "Tu cuenta todavía no está vinculada a ningún barbero. Pide que un administrador te vincule.",
          403
        );
      }
      if (booking.barber_id !== identity.barberId) {
        throw new StaffAuthError("No puedes modificar una cita que no es tuya.", 403);
      }
    }

    const updatePayload: Record<string, unknown> = { status };
    if (status === "completed") {
      updatePayload.completed_by = identity.userId;
    }

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId)
      .select("id, status, completed_at, completed_by, cancelled_at")
      .single();

    if (updateError || !updated) {
      res.status(500).json({ error: updateError?.message ?? "No se pudo actualizar la reserva." });
      return;
    }

    res.status(200).json({ success: true, booking: updated });
  } catch (error) {
    sendApiError(res, error);
  }
}
