import type { BookingStatus } from "../types/club.js";

/** Fuente única de nombres/colores de estado — la usan tanto "Mi
 * cuenta" (BookingCard) como el panel administrativo. */
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En proceso",
  completed: "Completada",
  no_show: "No asistió",
  cancelled: "Cancelada",
};

export const BOOKING_STATUS_CLASS: Record<BookingStatus, string> = {
  pending: "border-gold/30 text-gold/80",
  confirmed: "border-gold/40 text-gold",
  in_progress: "border-blue-400/40 text-blue-300",
  completed: "border-green-400/40 text-green-300",
  no_show: "border-blood/40 text-blood",
  cancelled: "border-bone/20 text-bone/50",
};

/** Orden en el que se ofrece el cambio de estado en el panel. */
export const BOOKING_STATUS_ORDER: BookingStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "no_show",
  "cancelled",
];
