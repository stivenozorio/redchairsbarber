import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireStaffUserId, StaffAuthError } from "../_lib/auth.js";
import { getCalendarClient, getCalendarIdForBarber, isBarberId, TIMEZONE } from "../_lib/googleCalendar.js";
import { buildSlotRange, fitsWithinHours, InvalidScheduleInputError } from "../_lib/schedule.js";
import { getEffectiveHours } from "../_lib/scheduleRepo.js";
import { getActiveBarbers } from "../_lib/catalogRepo.js";
import { listBusyIntervals, isRangeFree } from "../_lib/availability.js";
import { createBookingRecord, attachGoogleEvent, discardBooking } from "../_lib/bookingsRepo.js";
import { sendApiError } from "../_lib/http.js";

/**
 * Bloquea un horario específico de un barbero para un cliente
 * presencial (walk-in), sin pasar por el flujo público de reservas.
 *
 * Se modela como una reserva más (source='blocked', sin servicios, sin
 * cuenta) en vez de crear una tabla nueva: /api/availability solo
 * consulta Google Calendar para decidir qué horas están libres (no
 * Supabase), así que el bloqueo TIENE que existir como evento real en
 * el calendario del barbero para que el sitio público deje de
 * ofrecerlo. Reutilizar bookings también significa que "desbloquear"
 * es simplemente cambiar el estado a 'cancelled' con el endpoint que
 * ya existe (/api/staff/booking-status), que ya sabe borrar el evento
 * de Calendar — no hace falta un endpoint nuevo para eso.
 *
 * Un barbero solo puede bloquear su propia agenda; un admin puede
 * bloquear la de cualquiera (mismo criterio que booking-status.ts).
 */

interface RequestBody {
  barberId?: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
  note?: string;
}

const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 8 * 60;

function assertValidDuration(value: unknown): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < MIN_DURATION_MINUTES ||
    value > MAX_DURATION_MINUTES
  ) {
    throw new InvalidScheduleInputError(
      `La duración debe ser un número entre ${MIN_DURATION_MINUTES} y ${MAX_DURATION_MINUTES} minutos.`
    );
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const identity = await requireStaffUserId(req);

    const { barberId, date, time, durationMinutes, note } = (req.body ?? {}) as RequestBody;

    if (!barberId || !isBarberId(barberId)) {
      throw new InvalidScheduleInputError("Selecciona un barbero válido.");
    }
    if (!date || typeof date !== "string") {
      throw new InvalidScheduleInputError("El campo 'date' es requerido (YYYY-MM-DD).");
    }
    if (!time || typeof time !== "string") {
      throw new InvalidScheduleInputError("El campo 'time' es requerido.");
    }
    assertValidDuration(durationMinutes);

    if (identity.role === "barber") {
      if (!identity.barberId) {
        throw new StaffAuthError(
          "Tu cuenta todavía no está vinculada a ningún barbero. Pide que un administrador te vincule.",
          403
        );
      }
      if (identity.barberId !== barberId) {
        throw new StaffAuthError("No puedes bloquear horas de otro barbero.", 403);
      }
    }

    const { startISO, endISO } = buildSlotRange(date, time, durationMinutes);

    const hours = await getEffectiveHours(barberId, date);
    if (!hours || !fitsWithinHours(time, durationMinutes, hours)) {
      res.status(409).json({ error: "Ese horario está fuera del horario de atención de ese día." });
      return;
    }

    const calendar = getCalendarClient();
    const calendarId = getCalendarIdForBarber(barberId);
    const busyIntervals = await listBusyIntervals(calendar, calendarId, startISO, endISO);
    if (!isRangeFree(busyIntervals, startISO, endISO)) {
      res.status(409).json({ error: "Ya hay una cita en ese horario. Elige otro." });
      return;
    }

    const activeBarbers = await getActiveBarbers();
    const barberName = activeBarbers.find((b) => b.id === barberId)?.name ?? barberId;
    const trimmedNote = note?.trim() || "";

    const { bookingId, error: dbError } = await createBookingRecord({
      userId: null,
      barberId,
      startISO,
      endISO,
      totalPriceCop: 0,
      totalDurationMinutes: durationMinutes,
      customerName: "Bloqueado (uso interno)",
      customerPhone: "-",
      notes: trimmedNote || undefined,
      services: [],
      source: "blocked",
    });

    if (dbError) {
      res.status(500).json({ error: "No fue posible registrar el bloqueo.", detail: dbError });
      return;
    }

    let event;
    try {
      event = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: "Bloqueado — Cliente presencial",
          description: [
            `Bloqueado por: ${barberName}`,
            trimmedNote ? `Nota: ${trimmedNote}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          start: { dateTime: startISO, timeZone: TIMEZONE },
          end: { dateTime: endISO, timeZone: TIMEZONE },
          extendedProperties: {
            private: { source: "redchairs-block", barberId },
          },
        },
      });
    } catch (calendarError) {
      if (bookingId) await discardBooking(bookingId);
      throw calendarError;
    }

    if (bookingId && event.data.id) {
      await attachGoogleEvent(bookingId, event.data.id);
    }

    res.status(201).json({
      bookingId,
      googleEventId: event.data.id,
      barberId,
      start: startISO,
      end: endISO,
    });
  } catch (error) {
    sendApiError(res, error);
  }
}
