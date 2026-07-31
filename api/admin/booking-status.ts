import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdminUserId } from "../_lib/auth.js";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin.js";
import { getCalendarClient, getCalendarIdForBarber, isBarberId } from "../_lib/googleCalendar.js";
import { sendApiError } from "../_lib/http.js";
import { InvalidScheduleInputError } from "../_lib/schedule.js";

/**
 * Cambia el estado de una reserva desde el panel administrativo.
 *
 * Pasa por el servidor (en vez de una escritura directa desde el
 * navegador vía RLS) por una razón concreta: cancelar una cita también
 * debe liberar el evento en Google Calendar, y eso ninguna política de
 * RLS lo puede hacer por sí sola. El resto de las reservas sigue sin
 * tener política de escritura para nadie desde el navegador.
 *
 * Cuando el nuevo estado es 'completed', el trigger
 * set_booking_status_timestamps (0008) sella completed_at
 * automáticamente — ese es el enganche que usará la Fase 3 para otorgar
 * puntos. Este endpoint no implementa puntos, solo deja el estado y el
 * timestamp correctos.
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
    await requireAdminUserId(req);

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

    // Cancelar también libera el horario en el calendario del barbero: si
    // solo se actualizara Supabase, la cita seguiría ocupando ese horario
    // en Google Calendar como si siguiera en pie.
    if (status === "cancelled" && booking.google_event_id && isBarberId(booking.barber_id)) {
      try {
        const calendar = getCalendarClient();
        await calendar.events.delete({
          calendarId: getCalendarIdForBarber(booking.barber_id),
          eventId: booking.google_event_id,
        });
      } catch (error) {
        const httpStatus =
          (error as { code?: number; response?: { status?: number } }).code ??
          (error as { response?: { status?: number } }).response?.status;
        // Ya no existe en el calendario (404/410): es el resultado que se
        // buscaba de todas formas, seguir con la actualización en Supabase.
        if (httpStatus !== 404 && httpStatus !== 410) throw error;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId)
      .select("id, status, completed_at, cancelled_at")
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
