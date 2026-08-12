import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { calendar_v3 } from "googleapis";
import {
  getCalendarClient,
  getCalendarIdForBarber,
  isBarberId,
  TIMEZONE,
  type BarberId,
} from "./_lib/googleCalendar.js";
import { buildSlotRange, fitsWithinHours, InvalidScheduleInputError } from "./_lib/schedule.js";
import { getEffectiveHours } from "./_lib/scheduleRepo.js";
import { getActiveBarbers, getActiveServicesCatalog } from "./_lib/catalogRepo.js";
import { listBusyIntervals, isRangeFree } from "./_lib/availability.js";
import { sendApiError } from "./_lib/http.js";
import { getUserIdFromRequest } from "./_lib/auth.js";
import {
  attachGoogleEvent,
  createBookingRecord,
  discardBooking,
} from "./_lib/bookingsRepo.js";
import { redeemPointsForBooking } from "./_lib/pointsRepo.js";
import { sumServiceTotals, formatPriceNumber, calculateRedemptionCost } from "../src/data/services.js";

interface BookingRequestBody {
  services?: string[];
  barberId?: string;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
  notes?: string;
  /** Pagar con puntos RED CLUB en vez de efectivo — ver
   * 0019_points_redeem_functions.sql. Solo válido con cuenta y con
   * exactamente un servicio seleccionado (ver comentario más abajo). */
  redeemWithPoints?: boolean;
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
    const { services, barberId, date, time, name, phone, notes, redeemWithPoints } = body as Required<
      Omit<BookingRequestBody, "notes" | "redeemWithPoints">
    > & { notes?: string; redeemWithPoints?: boolean };

    if (barberId !== "any" && !isBarberId(barberId)) {
      throw new InvalidScheduleInputError(`Barbero inválido: ${barberId}`);
    }

    const activeBarbers = await getActiveBarbers();
    const barberName = (id: BarberId): string => activeBarbers.find((b) => b.id === id)?.name ?? id;

    const servicesCatalog = await getActiveServicesCatalog();
    const { totalMinutes, totalPrice, services: resolvedServices } = sumServiceTotals(
      services,
      servicesCatalog
    );
    if (totalMinutes <= 0) {
      throw new InvalidScheduleInputError("No se reconoció ningún servicio válido.");
    }

    // Reservar exige cuenta: sin esto, distintos intentos de la misma
    // persona sin sesión no tenían forma de reconocerse entre sí (nada
    // quedaba guardado que los relacionara), lo que producía reservas
    // duplicadas para el mismo horario. El frontend ya redirige a
    // quien no tiene sesión a /club/registro antes de llegar aquí (ver
    // ProtectedRoute en App.tsx), pero el servidor es quien de verdad
    // lo exige — nunca hay que confiar solo en que el navegador no deje
    // llegar la petición.
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      throw new InvalidScheduleInputError(
        "Debes iniciar sesión para reservar. Crea tu cuenta gratis en /club/registro."
      );
    }

    // El canje con puntos solo aplica a una reserva de UN solo servicio:
    // booking_services no tiene (ni necesita) un concepto de "método de
    // pago por línea" — el precio siempre ha sido de la reserva
    // completa. El costo se recalcula aquí con el precio vivo del
    // catálogo (no uno que haya mandado el navegador).
    let pointsCost = 0;
    if (redeemWithPoints) {
      if (resolvedServices.length !== 1) {
        throw new InvalidScheduleInputError(
          "El canje con puntos solo está disponible para reservas de un solo servicio."
        );
      }
      pointsCost = calculateRedemptionCost(totalPrice);
      if (pointsCost <= 0) {
        throw new InvalidScheduleInputError("Este servicio no se puede canjear con puntos.");
      }
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
        redeemWithPoints ? `Pagado con puntos RED CLUB: ${pointsCost} puntos` : null,
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
          redeemedWithPoints: String(Boolean(redeemWithPoints)),
          pointsRedeemed: redeemWithPoints ? String(pointsCost) : "",
        },
      },
    });

    // Candidate barbers to try, in order. A specific barber only tries their
    // own calendar; "sin preferencia" tries each barber in turn and books
    // with whoever is actually free. Solo se consideran barberos activos:
    // si el panel administrativo desactivó uno (vacaciones, etc.), deja de
    // recibir reservas nuevas sin tener que tocar el código.
    const activeBarberIds = activeBarbers.map((b) => b.id);
    const requestedCandidates: BarberId[] =
      barberId === "any" ? ["camilo", "alejandro"] : [barberId as BarberId];
    const candidates = requestedCandidates.filter((id) => activeBarberIds.includes(id));

    if (candidates.length === 0) {
      res.status(409).json({
        error:
          barberId === "any"
            ? "No hay barberos disponibles en este momento."
            : "Ese barbero no está disponible actualmente. Elige otro.",
      });
      return;
    }

    const hoursByCandidate = new Map<BarberId, Awaited<ReturnType<typeof getEffectiveHours>>>();
    await Promise.all(
      candidates.map(async (candidate) => {
        hoursByCandidate.set(candidate, await getEffectiveHours(candidate, date));
      })
    );

    const fitsForCandidate = (candidate: BarberId) => {
      const hours = hoursByCandidate.get(candidate);
      return Boolean(hours && fitsWithinHours(time, totalMinutes, hours));
    };

    if (!candidates.some(fitsForCandidate)) {
      res.status(409).json({
        error: "Ese horario está fuera del horario de atención. Elige otro.",
      });
      return;
    }

    let assignedTo: BarberId | null = null;
    for (const candidate of candidates) {
      if (!fitsForCandidate(candidate)) continue;
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
    //   2. Si es un canje, descontar los puntos de forma atómica
    //   3. Crear el evento en Google Calendar (agenda del barbero)
    //   4. Guardar el google_event_id y confirmar
    //
    // Si cualquier paso falla, se ABORTA descartando todo lo anterior:
    // una cita en la agenda sin registro en la base no se puede mostrar
    // en "Mi cuenta", ni cancelar, ni contar para el club — y una
    // reserva "canjeada" sin el descuento real de puntos sería un canje
    // gratis.
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
      redeemedWithPoints: Boolean(redeemWithPoints),
      pointsRedeemed: redeemWithPoints ? pointsCost : undefined,
    });

    if (dbError) {
      res.status(500).json({
        error: "No fue posible registrar tu reserva. Intenta de nuevo.",
        detail: dbError,
      });
      return;
    }

    if (redeemWithPoints && userId && bookingId) {
      const redemption = await redeemPointsForBooking(
        userId,
        bookingId,
        pointsCost,
        `Canje — ${resolvedServices[0].name}`
      );
      if (!redemption.ok) {
        await discardBooking(bookingId);
        res.status(409).json({
          error: redemption.error ?? "No tienes suficientes puntos para canjear este servicio.",
        });
        return;
      }
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
      redeemedWithPoints: Boolean(redeemWithPoints),
      pointsRedeemed: redeemWithPoints ? pointsCost : null,
    });
  } catch (error) {
    sendApiError(res, error);
  }
}
