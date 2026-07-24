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

/** Each barber has their own, fully independent Google Calendar. */
export const BARBER_IDS = ["camilo", "alejandro"] as const;
export type BarberId = (typeof BARBER_IDS)[number];

export function isBarberId(value: unknown): value is BarberId {
  return typeof value === "string" && (BARBER_IDS as readonly string[]).includes(value);
}

const BARBER_CALENDAR_ENV: Record<BarberId, string> = {
  camilo: "GOOGLE_CALENDAR_ID_CAMILO",
  alejandro: "GOOGLE_CALENDAR_ID_ALEJANDRO",
};

const REQUIRED_ENV_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "GOOGLE_CALENDAR_ID_CAMILO",
  "GOOGLE_CALENDAR_ID_ALEJANDRO",
] as const;

export class GoogleCalendarConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Faltan variables de entorno de Google Calendar: ${missing.join(", ")}`);
    this.name = "GoogleCalendarConfigError";
    this.missing = missing;
  }
}

/** Names of required env vars that are unset or blank, right now. Exposed
 * so /api/calendar-health can report status without needing a full
 * assertEnv() throw/catch round-trip. */
export function getMissingEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
}

function assertEnv(): void {
  const missing = getMissingEnvVars();
  if (missing.length > 0) {
    throw new GoogleCalendarConfigError(missing);
  }
}

/** Resolves the Google Calendar ID that belongs to a specific barber. */
export function getCalendarIdForBarber(barberId: BarberId): string {
  assertEnv();
  return process.env[BARBER_CALENDAR_ENV[barberId]] as string;
}

/** All configured calendar IDs, keyed by barber — used for the "sin
 * preferencia" flow, which needs to look across every barber's calendar. */
export function getAllCalendarIds(): Record<BarberId, string> {
  assertEnv();
  return {
    camilo: process.env[BARBER_CALENDAR_ENV.camilo] as string,
    alejandro: process.env[BARBER_CALENDAR_ENV.alejandro] as string,
  };
}

let cachedClient: calendar_v3.Calendar | null = null;

/** Lazily builds (and caches) an authenticated Google Calendar client.
 * The same OAuth credentials are used for every barber's calendar. */
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
