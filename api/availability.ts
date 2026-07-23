import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCalendarClient, getCalendarId } from "./_lib/googleCalendar.js";
import { buildDayRange, buildSlotRange, assertValidDate, InvalidScheduleInputError } from "./_lib/schedule.js";
import { listBusyIntervals, isRangeFree } from "./_lib/availability.js";
import { sendApiError } from "./_lib/http.js";
import { TIME_SLOTS } from "../src/data/booking.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const date = typeof req.query.date === "string" ? req.query.date : undefined;

  try {
    if (!date) {
      throw new InvalidScheduleInputError("El parámetro 'date' es requerido (YYYY-MM-DD).");
    }
    assertValidDate(date);

    const calendar = getCalendarClient();
    const calendarId = getCalendarId();
    const dayRange = buildDayRange(date);
    const busyIntervals = await listBusyIntervals(calendar, calendarId, dayRange.startISO, dayRange.endISO);

    const slots = TIME_SLOTS.map((time) => {
      const { startISO, endISO } = buildSlotRange(date, time);
      return { time, available: isRangeFree(busyIntervals, startISO, endISO) };
    });

    res.status(200).json({ date, slots });
  } catch (error) {
    sendApiError(res, error);
  }
}
