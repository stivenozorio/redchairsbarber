import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCalendarClient, getCalendarIdForBarber, isBarberId, TIMEZONE } from "./_lib/googleCalendar.js";
import {
  buildSlotRange,
  durationMinutesBetween,
  fitsBusinessHours,
  InvalidScheduleInputError,
} from "./_lib/schedule.js";
import { listBusyIntervals, isRangeFree } from "./_lib/availability.js";
import { sendApiError } from "./_lib/http.js";

interface RescheduleRequestBody {
  eventId?: string;
  barberId?: string;
  date?: string;
  time?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const { eventId, barberId, date, time } = (req.body ?? {}) as RescheduleRequestBody;
    if (!eventId || typeof eventId !== "string") {
      throw new InvalidScheduleInputError("El campo 'eventId' es requerido.");
    }
    if (!barberId || !isBarberId(barberId)) {
      throw new InvalidScheduleInputError("El campo 'barberId' es requerido y debe ser un barbero válido.");
    }
    if (!date || !time) {
      throw new InvalidScheduleInputError("Los campos 'date' y 'time' son requeridos.");
    }

    const calendar = getCalendarClient();
    const calendarId = getCalendarIdForBarber(barberId);

    // Keep the event's current length — read it back instead of trusting a
    // client-provided duration, so a reschedule never silently shrinks or
    // grows the appointment.
    const existing = await calendar.events.get({ calendarId, eventId });
    const existingStart = existing.data.start?.dateTime;
    const existingEnd = existing.data.end?.dateTime;
    if (!existingStart || !existingEnd) {
      throw new InvalidScheduleInputError("No se pudo leer la duración de la reserva original.");
    }
    const durationMinutes = durationMinutesBetween(existingStart, existingEnd);

    if (!fitsBusinessHours(time, durationMinutes)) {
      res.status(409).json({ error: "Ese horario no cabe en el horario de atención. Elige otro." });
      return;
    }

    const { startISO, endISO } = buildSlotRange(date, time, durationMinutes);

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
