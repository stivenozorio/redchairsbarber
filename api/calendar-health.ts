import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  BARBER_IDS,
  getCalendarClient,
  getCalendarIdForBarber,
  getMissingEnvVars,
  type BarberId,
} from "./_lib/googleCalendar.js";

interface BarberCheck {
  barberId: BarberId;
  reachable: boolean;
  error: string | null;
}

/** Read-only diagnostic endpoint: reports which Google Calendar env vars
 * are present (never their values) and, if all are present, whether each
 * barber's calendar ID is actually valid and reachable with the current
 * OAuth credentials. Does not create, modify or delete anything. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const missingEnvVars = getMissingEnvVars();

  if (missingEnvVars.length > 0) {
    res.status(200).json({ ok: false, missingEnvVars, barbers: [] });
    return;
  }

  let calendar;
  try {
    calendar = getCalendarClient();
  } catch (error) {
    res.status(200).json({
      ok: false,
      missingEnvVars,
      barbers: [],
      error: error instanceof Error ? error.message : "No se pudo crear el cliente de Google Calendar.",
    });
    return;
  }

  const barbers: BarberCheck[] = await Promise.all(
    BARBER_IDS.map(async (barberId): Promise<BarberCheck> => {
      const calendarId = getCalendarIdForBarber(barberId);
      try {
        await calendar.calendars.get({ calendarId });
        return { barberId, reachable: true, error: null };
      } catch (error) {
        const message =
          (error as { errors?: { message?: string }[] }).errors?.[0]?.message ??
          (error as { message?: string }).message ??
          "Error desconocido al consultar el calendario.";
        return { barberId, reachable: false, error: message };
      }
    })
  );

  const ok = barbers.every((b) => b.reachable);
  res.status(200).json({ ok, missingEnvVars: [], barbers });
}
