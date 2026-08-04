import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCalendarClient, getCalendarIdForBarber, isBarberId } from "./_lib/googleCalendar.js";
import { InvalidScheduleInputError } from "./_lib/schedule.js";
import { sendApiError } from "./_lib/http.js";
import { getUserIdFromRequest } from "./_lib/auth.js";
import { cancelBookingByEventId, getBookingByEventId, LOCKED_BOOKING_STATUSES } from "./_lib/bookingsRepo.js";

interface CancelRequestBody {
  eventId?: string;
  barberId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { eventId, barberId } = (req.body ?? {}) as CancelRequestBody;
    if (!eventId || typeof eventId !== "string") {
      throw new InvalidScheduleInputError("El campo 'eventId' es requerido.");
    }
    if (!barberId || !isBarberId(barberId)) {
      throw new InvalidScheduleInputError("El campo 'barberId' es requerido y debe ser un barbero válido.");
    }

    // Si la reserva tiene cuenta, solo su dueño (o quien no tenga forma
    // de probar que lo es porque la base todavía no tiene esa fila) puede
    // cancelarla. Sin esto, conocer el eventId alcanzaría para cancelar
    // la cita de cualquiera.
    const owner = await getBookingByEventId(eventId);
    if (owner) {
      if (LOCKED_BOOKING_STATUSES.includes(owner.status)) {
        res.status(409).json({ error: "Esta reserva ya no se puede cancelar." });
        return;
      }
      if (owner.userId) {
        const requesterId = await getUserIdFromRequest(req);
        if (requesterId !== owner.userId) {
          res.status(403).json({ error: "No tienes permiso para cancelar esta reserva." });
          return;
        }
      }
    }

    const calendar = getCalendarClient();
    const calendarId = getCalendarIdForBarber(barberId);

    try {
      await calendar.events.delete({ calendarId, eventId });
    } catch (error) {
      const status = (error as { code?: number; response?: { status?: number } }).code
        ?? (error as { response?: { status?: number } }).response?.status;
      // Already cancelled/removed on the calendar — treat as a successful
      // cancellation rather than an error for the client.
      if (status !== 404 && status !== 410) {
        throw error;
      }
    }

    // El evento ya no existe en el calendario; reflejarlo en la base.
    await cancelBookingByEventId(eventId);

    res.status(200).json({ success: true });
  } catch (error) {
    sendApiError(res, error);
  }
}
