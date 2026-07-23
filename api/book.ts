import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCalendarClient, getCalendarId, TIMEZONE } from "./_lib/googleCalendar.js";
import { buildSlotRange, InvalidScheduleInputError } from "./_lib/schedule.js";
import { listBusyIntervals, isRangeFree } from "./_lib/availability.js";
import { sendApiError } from "./_lib/http.js";

interface BookingRequestBody {
  service?: string;
  barber?: string;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
}

function assertBookingBody(body: BookingRequestBody) {
  const required: (keyof BookingRequestBody)[] = ["service", "barber", "date", "time", "name", "phone"];
  const missing = required.filter((key) => !body[key] || typeof body[key] !== "string" || !body[key]?.trim());
  if (missing.length > 0) {
    throw new InvalidScheduleInputError(`Faltan campos requeridos: ${missing.join(", ")}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const body = (req.body ?? {}) as BookingRequestBody;
    assertBookingBody(body);
    const { service, barber, date, time, name, phone } = body as Required<BookingRequestBody>;

    const calendar = getCalendarClient();
    const calendarId = getCalendarId();
    const { startISO, endISO } = buildSlotRange(date, time);

    // Re-check availability right before inserting to avoid double-booking
    // if two clients request the same slot at nearly the same time.
    const busyIntervals = await listBusyIntervals(calendar, calendarId, startISO, endISO);
    if (!isRangeFree(busyIntervals, startISO, endISO)) {
      res.status(409).json({ error: "Ese horario ya no está disponible. Elige otro." });
      return;
    }

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `${service} — ${name}`,
        description: [`Servicio: ${service}`, `Barbero: ${barber}`, `Teléfono: ${phone}`].join("\n"),
        start: { dateTime: startISO, timeZone: TIMEZONE },
        end: { dateTime: endISO, timeZone: TIMEZONE },
        extendedProperties: {
          private: { source: "redchairs-web", service, barber, phone, clientName: name },
        },
      },
    });

    res.status(201).json({
      id: event.data.id,
      htmlLink: event.data.htmlLink,
      start: startISO,
      end: endISO,
    });
  } catch (error) {
    sendApiError(res, error);
  }
}
