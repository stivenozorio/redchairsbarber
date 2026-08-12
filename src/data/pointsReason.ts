import type { PointsReason } from "../types/club.js";

/** Fuente única de nombres legibles para points_transactions.reason —
 * la usa el historial de puntos de "Mi cuenta" (PointsHistory.tsx).
 * Varios motivos todavía no se generan en ningún flujo (quedan
 * reservados para la Fase 5: referidos, recompensas del catálogo), pero
 * se tipan todos para no tener que volver a tocar esto al activarlos. */
export const POINTS_REASON_LABEL: Record<PointsReason, string> = {
  booking_attended: "Puntos por visita",
  reward_redemption: "Canje de puntos",
  redemption_refund: "Reembolso por cancelación",
  referral_bonus: "Bono por referido",
  referral_welcome: "Bono de bienvenida",
  birthday_bonus: "Regalo de cumpleaños",
  promotion: "Promoción",
  manual_adjustment: "Ajuste manual",
  no_show_penalty: "Penalización por inasistencia",
  expiration: "Puntos vencidos",
};
