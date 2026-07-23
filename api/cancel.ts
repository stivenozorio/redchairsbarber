import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCalendarClient, getCalendarId } from "./_lib/googleCalendar.js";
import { InvalidScheduleInputError } from "./_lib/schedule.js";
import { sendApiError } from "./_lib/http.js";

interface CancelRequestBody {
  eventId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { eventId } = (req.body ?? {}) as CancelRequestBody;
    if (!eventId || typeof eventId !== "string") {
      throw new InvalidScheduleInputError("El campo 'eventId' es requerido.");
    }

    const calendar = getCalendarClient();
    const calendarId = getCalendarId();

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

    res.status(200).json({ success: true });
  } catch (error) {
    sendApiError(res, error);
  }
}
