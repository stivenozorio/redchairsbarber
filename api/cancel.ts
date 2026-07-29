import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCalendarClient, getCalendarIdForBarber, isBarberId } from "./_lib/googleCalendar.js";
import { InvalidScheduleInputError } from "./_lib/schedule.js";
import { sendApiError } from "./_lib/http.js";
import { cancelBookingByEventId } from "./_lib/bookingsRepo.js";

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
