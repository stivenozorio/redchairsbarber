import { google, type calendar_v3 } from "googleapis";

/**
 * Colombia does not observe daylight saving time — America/Bogota is a
 * fixed UTC-05:00 offset year-round, so we can build RFC3339 timestamps
 * with an explicit offset instead of pulling in a timezone database.
 */
export const TIMEZONE = "America/Bogota";
export const UTC_OFFSET = "-05:00";

const DEFAULT_APPOINTMENT_DURATION_MINUTES = 60;

export const APPOINTMENT_DURATION_MINUTES = (() => {
  const raw = process.env.GOOGLE_CALENDAR_SLOT_DURATION_MINUTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_APPOINTMENT_DURATION_MINUTES;
})();

const REQUIRED_ENV_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "GOOGLE_CALENDAR_ID",
] as const;

export class GoogleCalendarConfigError extends Error {}

function assertEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new GoogleCalendarConfigError(
      `Faltan variables de entorno de Google Calendar: ${missing.join(", ")}`
    );
  }
}

export function getCalendarId(): string {
  assertEnv();
  return process.env.GOOGLE_CALENDAR_ID as string;
}

let cachedClient: calendar_v3.Calendar | null = null;

/** Lazily builds (and caches) an authenticated Google Calendar client. */
export function getCalendarClient(): calendar_v3.Calendar {
  assertEnv();

  if (!cachedClient) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    cachedClient = google.calendar({ version: "v3", auth: oauth2Client });
  }

  return cachedClient;
}
