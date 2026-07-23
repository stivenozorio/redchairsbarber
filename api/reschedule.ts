import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCalendarClient, getCalendarId, TIMEZONE } from "./_lib/googleCalendar.js";
import { buildSlotRange, InvalidScheduleInputError } from "./_lib/schedule.js";
import { listBusyIntervals, isRangeFree } from "./_lib/availability.js";
import { sendApiError } from "./_lib/http.js";

interface RescheduleRequestBody {
  eventId?: string;
  date?: string;
  time?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { eventId, date, time } = (req.body ?? {}) as RescheduleRequestBody;
    if (!eventId || typeof eventId !== "string") {
      throw new InvalidScheduleInputError("El campo 'eventId' es requerido.");
    }
    if (!date || !time) {
      throw new InvalidScheduleInputError("Los campos 'date' y 'time' son requeridos.");
    }

    const calendar = getCalendarClient();
    const calendarId = getCalendarId();
    const { startISO, endISO } = buildSlotRange(date, time);

    // Exclude the event's own current slot from the conflict check so it
    // doesn't block itself when moving to a nearby/overlapping time.
    const busyIntervals = await listBusyIntervals(calendar, calendarId, startISO, endISO);
    if (!isRangeFree(busyIntervals, startISO, endISO, eventId)) {
      res.status(409).json({ error: "Ese horario ya no está disponible. Elige otro." });
      return;
    }

    const event = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        start: { dateTime: startISO, timeZone: TIMEZONE },
        end: { dateTime: endISO, timeZone: TIMEZONE },
      },
    });

    res.status(200).json({
      id: event.data.id,
      htmlLink: event.data.htmlLink,
      start: startISO,
      end: endISO,
    });
  } catch (error) {
    sendApiError(res, error);
  }
}
