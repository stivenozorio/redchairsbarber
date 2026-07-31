const TIME_ZONE = "America/Bogota";

/** Fecha larga en español y en hora de Bogotá — ej. "sábado, 25 de julio de 2026". */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Hora en formato local — ej. "3:00 p. m." */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCop(value: number): string {
  return `$${value.toLocaleString("es-CO")}`;
}

/** Rango de "hoy" en hora de Bogotá (offset fijo -05:00, sin horario de
 * verano — igual que api/_lib/schedule.ts en el servidor). Lo usan el
 * dashboard administrativo y el panel del barbero para acotar la
 * consulta de reservas al día en curso. */
export function todayBogotaRange() {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const nextDay = new Date(`${dateStr}T00:00:00-05:00`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return {
    dateStr,
    startISO: `${dateStr}T00:00:00-05:00`,
    endISO: nextDay.toISOString(),
  };
}
