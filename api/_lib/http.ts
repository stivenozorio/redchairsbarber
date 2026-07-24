import type { VercelResponse } from "@vercel/node";
import { GoogleCalendarConfigError } from "./googleCalendar.js";
import { InvalidScheduleInputError } from "./schedule.js";

/** Maps known error types to an HTTP status + safe message, and falls back
 * to a generic 500 for anything unexpected (logging the real cause). */
export function sendApiError(res: VercelResponse, error: unknown): void {
  if (error instanceof InvalidScheduleInputError) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (error instanceof GoogleCalendarConfigError) {
    console.error("Google Calendar no está configurado:", error.message);
    res.status(500).json({
      error: "El sistema de reservas no está disponible en este momento.",
      missingEnvVars: error.missing,
    });
    return;
  }

  console.error("Error inesperado en la API de reservas:", error);
  res.status(500).json({ error: "Ocurrió un error inesperado. Intenta de nuevo." });
}
