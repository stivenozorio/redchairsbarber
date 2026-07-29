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
import { getUserIdFromRequest } from "./_lib/auth.js";
import {
  attachGoogleEvent,
  createBookingRecord,
  discardBooking,
} from "./_lib/bookingsRepo.js";
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

/** Whether a barber's calendar has no conflicting event in the range. */
async function isBarberFree(
  calendar: calendar_v3.Calendar,
  barberId: BarberId,
  startISO: string,
  endISO: string
): Promise<boolean> {
  const calendarId = getCalendarIdForBarber(barberId);
  const busyIntervals = await listBusyIntervals(calendar, calendarId, startISO, endISO);
  return isRangeFree(busyIntervals, startISO, endISO);
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

    let assignedTo: BarberId | null = null;
    for (const candidate of candidates) {
      if (await isBarberFree(calendar, candidate, startISO, endISO)) {
        assignedTo = candidate;
        break;
      }
    }

    if (!assignedTo) {
      res.status(409).json({
        error:
          barberId === "any"
            ? "Ese horario ya no está disponible con ningún barbero. Elige otro."
            : "Ese horario ya no está disponible. Elige otro.",
      });
      return;
    }

    // Flujo definido para RED CLUB:
    //   1. Guardar la reserva + sus servicios en Supabase (fuente de verdad)
    //   2. Crear el evento en Google Calendar (agenda del barbero)
    //   3. Guardar el google_event_id y confirmar
    //
    // Si el paso 1 falla, se ABORTA: no se crea el evento en Calendar.
    // Una cita en la agenda sin registro en la base no se puede mostrar
    // en "Mi cuenta", ni cancelar, ni contar para el club.
    const userId = await getUserIdFromRequest(req);
    const { bookingId, error: dbError } = await createBookingRecord({
      userId,
      barberId: assignedTo,
      startISO,
      endISO,
      totalPriceCop: totalPrice,
      totalDurationMinutes: totalMinutes,
      customerName: name,
      customerPhone: phone,
      notes,
      services: resolvedServices,
    });

    if (dbError) {
      res.status(500).json({
        error: "No fue posible registrar tu reserva. Intenta de nuevo.",
        detail: dbError,
      });
      return;
    }

    let event;
    try {
      event = await calendar.events.insert({
        calendarId: getCalendarIdForBarber(assignedTo),
        requestBody: buildEventBody(assignedTo),
      });
    } catch (calendarError) {
      // El evento no se creó: la reserva en la base no puede quedar
      // viva ocupando un horario que en realidad está libre.
      if (bookingId) await discardBooking(bookingId);
      throw calendarError;
    }

    if (bookingId && event.data.id) {
      const { error: linkError } = await attachGoogleEvent(bookingId, event.data.id);
      if (linkError) {
        // El evento existe pero quedó sin enlazar: se registra para
        // poder reconciliarlo, sin fallarle al cliente que ya tiene cita.
        console.error(
          `Reserva ${bookingId} creada en Calendar (${event.data.id}) pero no se pudo enlazar:`,
          linkError
        );
      }
    }

    res.status(201).json({
      id: event.data.id,
      bookingId,
      htmlLink: event.data.htmlLink,
      start: startISO,
      end: endISO,
      assignedBarberId: assignedTo,
      assignedBarberName: barberName(assignedTo),
      totalMinutes,
      totalPrice,
    });
  } catch (error) {
    sendApiError(res, error);
  }
}
