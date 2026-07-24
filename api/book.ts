import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { calendar_v3 } from "googleapis";
import {
  getCalendarClient,
  getCalendarIdForBarber,
  isBarberId,
  TIMEZONE,
  type BarberId,
} from "./_lib/googleCalendar.js";
import { buildSlotRange, fitsBusinessHours, InvalidScheduleInputError } from "./_lib/schedule.js";
import { listBusyIntervals, isRangeFree } from "./_lib/availability.js";
import { sendApiError } from "./_lib/http.js";
import { BARBERS } from "../src/data/booking.js";
import { sumServiceTotals, formatPriceNumber } from "../src/data/services.js";

interface BookingRequestBody {
  services?: string[];
  barberId?: string;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
  notes?: string;
}

function barberName(barberId: BarberId): string {
  return BARBERS.find((b) => b.id === barberId)?.name ?? barberId;
}

function assertBookingBody(body: BookingRequestBody) {
  if (!Array.isArray(body.services) || body.services.length === 0) {
    throw new InvalidScheduleInputError("Selecciona al menos un servicio.");
  }
  const required: (keyof BookingRequestBody)[] = ["barberId", "date", "time", "name", "phone"];
  const missing = required.filter((key) => {
    const value = body[key];
    return !value || typeof value !== "string" || !value.trim();
  });
  if (missing.length > 0) {
    throw new InvalidScheduleInputError(`Faltan campos requeridos: ${missing.join(", ")}`);
  }
}

/** Tries to book on a single barber's calendar. Returns the created event
 * info, or null if that barber isn't free for the requested slot. */
async function tryBookOnCalendar(
  calendar: calendar_v3.Calendar,
  barberId: BarberId,
  startISO: string,
  endISO: string,
  eventBody: calendar_v3.Schema$Event
) {
  const calendarId = getCalendarIdForBarber(barberId);
  const busyIntervals = await listBusyIntervals(calendar, calendarId, startISO, endISO);
  if (!isRangeFree(busyIntervals, startISO, endISO)) {
    return null;
  }
  const event = await calendar.events.insert({ calendarId, requestBody: eventBody });
  return event;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const body = (req.body ?? {}) as BookingRequestBody;
    assertBookingBody(body);
    const { services, barberId, date, time, name, phone, notes } = body as Required<
      Omit<BookingRequestBody, "notes">
    > & { notes?: string };

    if (barberId !== "any" && !isBarberId(barberId)) {
      throw new InvalidScheduleInputError(`Barbero inválido: ${barberId}`);
    }

    const { totalMinutes, totalPrice, services: resolvedServices } = sumServiceTotals(services);
    if (totalMinutes <= 0) {
      throw new InvalidScheduleInputError("No se reconoció ningún servicio válido.");
    }
    if (!fitsBusinessHours(time, totalMinutes)) {
      res.status(409).json({
        error: "La duración total de los servicios seleccionados no cabe en el horario de atención a esa hora.",
      });
      return;
    }

    const calendar = getCalendarClient();
    const { startISO, endISO } = buildSlotRange(date, time, totalMinutes);

    const servicesList = resolvedServices.map((s) => `- ${s.name} (${s.price})`).join("\n");
    const buildDescription = (assignedTo: BarberId) =>
      [
        `Cliente: ${name}`,
        `Teléfono: ${phone}`,
        `Barbero: ${barberName(assignedTo)}`,
        "Servicios:",
        servicesList,
        `Valor total: ${formatPriceNumber(totalPrice)}`,
        notes?.trim() ? `Observaciones: ${notes.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");

    const buildEventBody = (assignedTo: BarberId) => ({
      summary: `${resolvedServices.map((s) => s.name).join(" + ")} — ${name}`,
      description: buildDescription(assignedTo),
      start: { dateTime: startISO, timeZone: TIMEZONE },
      end: { dateTime: endISO, timeZone: TIMEZONE },
      extendedProperties: {
        private: {
          source: "redchairs-web",
          barberId: assignedTo,
          phone,
          clientName: name,
          services: services.join("|"),
          totalPrice: String(totalPrice),
          notes: notes ?? "",
        },
      },
    });

    // Candidate barbers to try, in order. A specific barber only tries their
    // own calendar; "sin preferencia" tries each barber in turn and books
    // with whoever is actually free.
    const candidates: BarberId[] = barberId === "any" ? ["camilo", "alejandro"] : [barberId as BarberId];

    for (const candidate of candidates) {
      const event = await tryBookOnCalendar(
        calendar,
        candidate,
        startISO,
        endISO,
        buildEventBody(candidate)
      );
      if (event) {
        res.status(201).json({
          id: event.data.id,
          htmlLink: event.data.htmlLink,
          start: startISO,
          end: endISO,
          assignedBarberId: candidate,
          assignedBarberName: barberName(candidate),
          totalMinutes,
          totalPrice,
        });
        return;
      }
    }

    res.status(409).json({
      error:
        barberId === "any"
          ? "Ese horario ya no está disponible con ningún barbero. Elige otro."
          : "Ese horario ya no está disponible. Elige otro.",
    });
  } catch (error) {
    sendApiError(res, error);
  }
}
