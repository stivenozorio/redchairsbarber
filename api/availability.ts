import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getCalendarClient,
  getCalendarIdForBarber,
  getAllCalendarIds,
  isBarberId,
  type BarberId,
} from "./_lib/googleCalendar.js";
import {
  buildDayRange,
  buildSlotRange,
  assertValidDate,
  fitsBusinessHours,
  InvalidScheduleInputError,
} from "./_lib/schedule.js";
import { listBusyIntervals, isRangeFree, type BusyInterval } from "./_lib/availability.js";
import { sendApiError } from "./_lib/http.js";
import { TIME_SLOTS } from "../src/data/booking.js";
import { sumServiceTotals } from "../src/data/services.js";

function parseServicesParam(raw: string | string[] | undefined): string[] {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((part) => decodeURIComponent(part.trim()))
    .filter(Boolean);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const date = typeof req.query.date === "string" ? req.query.date : undefined;
  const barberIdRaw = typeof req.query.barberId === "string" ? req.query.barberId : undefined;
  const serviceNames = parseServicesParam(req.query.services);

  try {
    if (!date) {
      throw new InvalidScheduleInputError("El parámetro 'date' es requerido (YYYY-MM-DD).");
    }
    assertValidDate(date);

    if (!barberIdRaw) {
      throw new InvalidScheduleInputError("El parámetro 'barberId' es requerido.");
    }
    if (serviceNames.length === 0) {
      throw new InvalidScheduleInputError("Selecciona al menos un servicio.");
    }

    const { totalMinutes, totalPrice } = sumServiceTotals(serviceNames);
    if (totalMinutes <= 0) {
      throw new InvalidScheduleInputError("No se reconoció ningún servicio válido.");
    }

    const calendar = getCalendarClient();
    const dayRange = buildDayRange(date);

    let busyByBarber: Partial<Record<BarberId, BusyInterval[]>>;

    if (barberIdRaw === "any") {
      const calendarIds = getAllCalendarIds();
      const entries = await Promise.all(
        (Object.keys(calendarIds) as BarberId[]).map(async (barberId) => [
          barberId,
          await listBusyIntervals(calendar, calendarIds[barberId], dayRange.startISO, dayRange.endISO),
        ] as const)
      );
      busyByBarber = Object.fromEntries(entries);
    } else if (isBarberId(barberIdRaw)) {
      const calendarId = getCalendarIdForBarber(barberIdRaw);
      busyByBarber = {
        [barberIdRaw]: await listBusyIntervals(calendar, calendarId, dayRange.startISO, dayRange.endISO),
      };
    } else {
      throw new InvalidScheduleInputError(`Barbero inválido: ${barberIdRaw}`);
    }

    const barberIds = Object.keys(busyByBarber) as BarberId[];

    const slots = TIME_SLOTS.map((time) => {
      if (!fitsBusinessHours(time, totalMinutes)) {
        return { time, available: false };
      }
      const { startISO, endISO } = buildSlotRange(date, time, totalMinutes);
      // "Sin preferencia" is bookable as long as at least one barber is free.
      const available = barberIds.some((barberId) =>
        isRangeFree(busyByBarber[barberId] ?? [], startISO, endISO)
      );
      return { time, available };
    });

    res.status(200).json({ date, barberId: barberIdRaw, totalMinutes, totalPrice, slots });
  } catch (error) {
    sendApiError(res, error);
  }
}
