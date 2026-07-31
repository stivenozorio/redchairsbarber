import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireStaffUserId, StaffAuthError } from "../_lib/auth.js";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin.js";
import { getCalendarClient, getCalendarIdForBarber, isBarberId } from "../_lib/googleCalendar.js";
import { logCalendarSyncError } from "../_lib/calendarSyncLog.js";
import { sendApiError } from "../_lib/http.js";
import { InvalidScheduleInputError } from "../_lib/schedule.js";

/**
 * Cambia el estado de una reserva desde el panel administrativo o el
 * panel del barbero. Lo usan ambos: un admin puede tocar cualquier
 * reserva; un barbero solo las suyas (se resuelve su barbers.id vía
 * barbers.user_id — ver requireStaffUserId).
 *
 * Google Calendar solo se toca para UN caso: cuando el nuevo estado es
 * 'cancelled', se libera el horario borrando el evento — así nunca
 * queda un cupo bloqueado por una cita que en Supabase ya no existe.
 * El resto de los estados (incluido 'no_show': la cita sí ocurrió y
 * debe quedar como registro histórico) son solo seguimiento operativo
 * interno y no tocan Calendar en absoluto.
 *
 * Orden de operaciones para 'cancelled':
 *   1. Actualizar Supabase.
 *   2. Solo si eso tuvo éxito, intentar borrar el evento de Calendar.
 *   3. Si el borrado falla, se registra en calendar_sync_errors (no
 *      solo en los logs de Vercel, que se pierden con el tiempo) y se
 *      informa en la respuesta — pero el estado en Supabase NUNCA se
 *      revierte: ya es la fuente de verdad y el cliente ya lo espera.
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

/** true si Calendar respondió "ya no existe" (404/410) — borrarlo era
 * el objetivo de todas formas, no es un fallo real de sincronización. */
function isAlreadyGoneError(error: unknown): boolean {
  const status =
    (error as { code?: number; response?: { status?: number } }).code ??
    (error as { response?: { status?: number } }).response?.status;
  return status === 404 || status === 410;
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
      .select("id, barber_id, status, google_event_id")
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

    // 1. Actualizar Supabase — es la fuente de verdad y va primero.
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

    // 2. Solo si Supabase quedó bien Y el nuevo estado es 'cancelled',
    // liberar el horario en el calendario del barbero.
    let calendarSyncError: string | null = null;
    if (status === "cancelled" && booking.google_event_id && isBarberId(booking.barber_id)) {
      try {
        const calendar = getCalendarClient();
        await calendar.events.delete({
          calendarId: getCalendarIdForBarber(booking.barber_id),
          eventId: booking.google_event_id,
        });
      } catch (error) {
        if (!isAlreadyGoneError(error)) {
          // 3. Fallo real: se registra para poder corregirlo después,
          // pero Supabase ya quedó en 'cancelled' y así se queda.
          const message = error instanceof Error ? error.message : "Error desconocido de Google Calendar.";
          console.error(`No se pudo liberar el horario en Calendar para la reserva ${bookingId}:`, error);
          await logCalendarSyncError({
            bookingId,
            googleEventId: booking.google_event_id,
            barberId: booking.barber_id,
            errorMessage: message,
          });
          calendarSyncError =
            "La reserva se canceló, pero no se pudo liberar el horario en Google Calendar. Revísalo manualmente.";
        }
      }
    }

    res.status(200).json({ success: true, booking: updated, calendarSyncError });
  } catch (error) {
    sendApiError(res, error);
  }
}
