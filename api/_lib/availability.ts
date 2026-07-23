import type { calendar_v3 } from "googleapis";

export interface BusyInterval {
  id: string | null | undefined;
  start: number;
  end: number;
}

/** Lists non-cancelled events overlapping [timeMinISO, timeMaxISO) as
 * simple {id, start, end} millisecond intervals. */
export async function listBusyIntervals(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string
): Promise<BusyInterval[]> {
  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: true,
    orderBy: "startTime",
  });

  const items = res.data.items ?? [];
  return items
    .filter((event) => event.status !== "cancelled")
    .map((event) => {
      const startRaw = event.start?.dateTime ?? event.start?.date;
      const endRaw = event.end?.dateTime ?? event.end?.date;
      return {
        id: event.id,
        start: startRaw ? new Date(startRaw).getTime() : NaN,
        end: endRaw ? new Date(endRaw).getTime() : NaN,
      };
    })
    .filter((interval) => Number.isFinite(interval.start) && Number.isFinite(interval.end));
}

export function rangesOverlap(aStartMs: number, aEndMs: number, bStartMs: number, bEndMs: number): boolean {
  return aStartMs < bEndMs && bStartMs < aEndMs;
}

/** Whether [startISO, endISO) is free of any busy interval, optionally
 * ignoring one event (used by reschedule, so an event doesn't block itself). */
export function isRangeFree(
  busyIntervals: BusyInterval[],
  startISO: string,
  endISO: string,
  excludeEventId?: string
): boolean {
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();

  return !busyIntervals.some((interval) => {
    if (excludeEventId && interval.id === excludeEventId) return false;
    return rangesOverlap(startMs, endMs, interval.start, interval.end);
  });
}
