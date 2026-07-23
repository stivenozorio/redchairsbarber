import { APPOINTMENT_DURATION_MINUTES, UTC_OFFSET } from "./googleCalendar.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(\d{1,2}):(\d{2})\s?(am|pm)$/i;

export class InvalidScheduleInputError extends Error {}

export function assertValidDate(date: string): void {
  if (!DATE_RE.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
    throw new InvalidScheduleInputError(`Fecha inválida: ${date}`);
  }
}

function parseTimeLabel(time: string): { hours: number; minutes: number } {
  const match = time.trim().match(TIME_RE);
  if (!match) {
    throw new InvalidScheduleInputError(`Hora inválida: ${time}`);
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toLowerCase();
  if (meridiem === "pm" && hours !== 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return { hours, minutes };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function totalMinutesToISO(dateStr: string, totalMinutes: number): string {
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const minutesInDay = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(minutesInDay / 60);
  const minutes = minutesInDay % 60;
  const effectiveDate = dayOffset !== 0 ? addDays(dateStr, dayOffset) : dateStr;
  return `${effectiveDate}T${pad(hours)}:${pad(minutes)}:00${UTC_OFFSET}`;
}

export interface SlotRange {
  startISO: string;
  endISO: string;
}

/** Converts a date ("2026-07-23") + slot label ("10:00 am") into an
 * America/Bogota RFC3339 start/end range for the configured appointment
 * duration. */
export function buildSlotRange(
  date: string,
  time: string,
  durationMinutes: number = APPOINTMENT_DURATION_MINUTES
): SlotRange {
  assertValidDate(date);
  const { hours, minutes } = parseTimeLabel(time);
  const startTotalMinutes = hours * 60 + minutes;
  const endTotalMinutes = startTotalMinutes + durationMinutes;

  return {
    startISO: totalMinutesToISO(date, startTotalMinutes),
    endISO: totalMinutesToISO(date, endTotalMinutes),
  };
}

/** Full-day range (00:00 to 23:59:59) for a given date, used to fetch all
 * busy intervals in one calendar query. */
export function buildDayRange(date: string): SlotRange {
  assertValidDate(date);
  return {
    startISO: `${date}T00:00:00${UTC_OFFSET}`,
    endISO: `${addDays(date, 1)}T00:00:00${UTC_OFFSET}`,
  };
}
