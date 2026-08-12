/** Tipos de las tablas de RED CLUB usadas desde el navegador.
 * Espejo de supabase/migrations/0001_schema.sql. */

export type UserRole = "client" | "barber" | "admin";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "no_show"
  | "cancelled";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  birthday: string | null;
  role: UserRole;
  referral_code: string | null;
  referred_by: string | null;
  visit_count: number;
  marketing_opt_in: boolean;
  /** El teléfono se pide una sola vez a quien entra con Google. */
  phone_prompt_dismissed: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookingServiceRow {
  id: string;
  service_id: string | null;
  name_snapshot: string;
  price_cop_snapshot: number;
  duration_minutes_snapshot: number;
  position: number;
}

export interface BookingRow {
  id: string;
  user_id: string | null;
  barber_id: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  total_price_cop: number;
  total_duration_minutes: number;
  customer_name: string;
  /** Ausente cuando la consulta lo excluyó a propósito — el panel del
   * barbero no lo pide (ver useStaffBookings.ts): un barbero no debe
   * poder ver el teléfono del cliente, solo un administrador. */
  customer_phone?: string;
  notes: string | null;
  google_event_id: string | null;
  created_at: string;
  /** 'web' = reserva normal de un cliente. 'blocked' = el barbero
   * bloqueó ese horario para un cliente presencial (ver
   * api/staff/block-slot.ts) — no es una cita real. Columna de texto
   * libre en la base, así que se deja abierta a valores futuros. */
  source: string;
  /** Pagada con puntos RED CLUB en vez de efectivo (ver
   * 0018_points_redemption.sql). Si es true, points_redeemed siempre
   * tiene un valor positivo; si es false, points_redeemed es null. Una
   * reserva canjeada NO otorga los puntos normales del servicio al
   * completarse (pero sí sigue sumando la visita). */
  redeemed_with_points: boolean;
  points_redeemed: number | null;
  booking_services?: BookingServiceRow[];
}

/** Motivos del ledger de puntos (points_transactions.reason) — espejo
 * del enum points_reason. Varios todavía no se usan en la interfaz
 * (quedan para Fase 5: referidos, recompensas), pero se tipan todos
 * para no tener que volver a tocar esto cuando se activen. */
export type PointsReason =
  | "booking_attended"
  | "referral_bonus"
  | "referral_welcome"
  | "reward_redemption"
  | "redemption_refund"
  | "birthday_bonus"
  | "promotion"
  | "manual_adjustment"
  | "no_show_penalty"
  | "expiration";

export interface PointsTransactionRow {
  id: string;
  amount: number;
  reason: PointsReason;
  description: string | null;
  booking_id: string | null;
  created_at: string;
}

/** Vista club_member_summary — ya calcula puntos y nivel aunque la
 * interfaz de la Fase 1 todavía no los muestre. */
export interface ClubMemberSummary {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  visit_count: number;
  referral_code: string | null;
  points_balance: number;
  tier_id: string | null;
  tier_name: string | null;
  tier_min_visits: number | null;
  tier_max_visits: number | null;
}
