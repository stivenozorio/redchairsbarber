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
  fitsWithinHours,
  InvalidScheduleInputError,
} from "./_lib/schedule.js";
import { getEffectiveHours } from "./_lib/scheduleRepo.js";
import { getActiveBarberIds, getActiveServicesCatalog } from "./_lib/catalogRepo.js";
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

    const servicesCatalog = await getActiveServicesCatalog();
    const { totalMinutes, totalPrice } = sumServiceTotals(serviceNames, servicesCatalog);
    if (totalMinutes <= 0) {
      throw new InvalidScheduleInputError("No se reconoció ningún servicio válido.");
    }

    const calendar = getCalendarClient();
    const dayRange = buildDayRange(date);
    const activeBarberIds = await getActiveBarberIds();

    let busyByBarber: Partial<Record<BarberId, BusyInterval[]>>;

    if (barberIdRaw === "any") {
      const calendarIds = getAllCalendarIds();
      // Barbero desactivado desde el panel: no se le consulta el
      // calendario, así que ningún slot lo cuenta como disponible.
      const idsToQuery = (Object.keys(calendarIds) as BarberId[]).filter((id) =>
        activeBarberIds.includes(id)
      );
      const entries = await Promise.all(
        idsToQuery.map(async (barberId) => [
          barberId,
          await listBusyIntervals(calendar, calendarIds[barberId], dayRange.startISO, dayRange.endISO),
        ] as const)
      );
      busyByBarber = Object.fromEntries(entries);
    } else if (isBarberId(barberIdRaw)) {
      // Igual: si este barbero específico no está activo, no hay
      // disponibilidad que consultar — todos los slots saldrán ocupados.
      busyByBarber = activeBarberIds.includes(barberIdRaw)
        ? {
            [barberIdRaw]: await listBusyIntervals(
              calendar,
              getCalendarIdForBarber(barberIdRaw),
              dayRange.startISO,
              dayRange.endISO
            ),
          }
        : {};
    } else {
      throw new InvalidScheduleInputError(`Barbero inválido: ${barberIdRaw}`);
    }

    const barberIds = Object.keys(busyByBarber) as BarberId[];

    const hoursByBarber = new Map<BarberId, Awaited<ReturnType<typeof getEffectiveHours>>>();
    await Promise.all(
      barberIds.map(async (id) => {
        hoursByBarber.set(id, await getEffectiveHours(id, date));
      })
    );

    const slots = TIME_SLOTS.map((time) => {
      // "Sin preferencia" is bookable as long as at least one barber is
      // both within their configured hours that day and free.
      const available = barberIds.some((barberId) => {
        const hours = hoursByBarber.get(barberId);
        if (!hours || !fitsWithinHours(time, totalMinutes, hours)) return false;
        const { startISO, endISO } = buildSlotRange(date, time, totalMinutes);
        return isRangeFree(busyByBarber[barberId] ?? [], startISO, endISO);
      });
      return { time, available };
    });

    res.status(200).json({ date, barberId: barberIdRaw, totalMinutes, totalPrice, slots });
  } catch (error) {
    sendApiError(res, error);
  }
}
