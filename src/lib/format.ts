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
