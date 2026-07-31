import { getSupabaseAdmin, isSupabaseConfigured } from "./supabaseAdmin.js";
import { FALLBACK_CLOSE_MINUTES, FALLBACK_OPEN_MINUTES, type HoursRange } from "./schedule.js";
import type { BarberId } from "./googleCalendar.js";

/**
 * Horario efectivo de un barbero en una fecha concreta.
 *
 * Orden de resolución:
 *   1. Excepción puntual para ESE barbero en esa fecha (festivo u horario
 *      especial) — gana sobre cualquier otra cosa.
 *   2. Excepción global (barber_id null) de toda la barbería en esa fecha.
 *   3. Horario semanal del barbero para ese día de la semana.
 *   4. Si Supabase no está configurado, o la tabla de horarios todavía no
 *      tiene filas para este barbero (antes de ejecutar el seed), el
 *      horario fijo histórico — así una base sin migrar sigue aceptando
 *      reservas exactamente como antes de esta fase.
 *
 * `null` significa "cerrado ese día".
 */
export async function getEffectiveHours(barberId: BarberId, date: string): Promise<HoursRange | null> {
  const fallback: HoursRange = { openMinutes: FALLBACK_OPEN_MINUTES, closeMinutes: FALLBACK_CLOSE_MINUTES };

  if (!isSupabaseConfigured()) return fallback;
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallback;

  const { data: exceptions, error: exceptionsError } = await supabase
    .from("schedule_exceptions")
    .select("barber_id, is_closed, open_time, close_time")
    .eq("date", date)
    .or(`barber_id.eq.${barberId},barber_id.is.null`);

  if (!exceptionsError && exceptions && exceptions.length > 0) {
    const specific = exceptions.find((e) => e.barber_id === barberId);
    const exception = specific ?? exceptions[0];
    if (exception.is_closed) return null;
    if (exception.open_time && exception.close_time) {
      return { openMinutes: timeToMinutes(exception.open_time), closeMinutes: timeToMinutes(exception.close_time) };
    }
  }

  const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
  const { data: weekly, error: weeklyError } = await supabase
    .from("barber_schedules")
    .select("is_open, open_time, close_time")
    .eq("barber_id", barberId)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  // Sin fila = todavía no se ejecutó la migración/seed de horarios para
  // este barbero: usar el horario fijo en vez de bloquear la reserva.
  if (weeklyError || !weekly) return fallback;
  if (!weekly.is_open) return null;
  if (!weekly.open_time || !weekly.close_time) return fallback;
  return { openMinutes: timeToMinutes(weekly.open_time), closeMinutes: timeToMinutes(weekly.close_time) };
}

/** "10:00:00" o "10:00" -> 600 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((part) => parseInt(part, 10));
  return h * 60 + (m || 0);
}
