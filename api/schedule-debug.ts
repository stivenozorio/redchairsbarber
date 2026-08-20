import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, isSupabaseConfigured } from "./_lib/supabaseAdmin.js";
import { isBarberId } from "./_lib/googleCalendar.js";
import { assertValidDate, InvalidScheduleInputError } from "./_lib/schedule.js";
import { sendApiError } from "./_lib/http.js";

/**
 * Diagnóstico TEMPORAL de solo lectura: getEffectiveHours
 * (api/_lib/scheduleRepo.ts) no está respetando barber_schedules.is_open
 * en producción para un barbero/fecha puntual, aunque la fila en la base
 * ya se confirmó correcta por otra vía (SQL Editor). Esto muestra cada
 * paso de la resolución por separado (día de la semana calculado,
 * excepciones crudas, horario del día puntual, y las 7 filas completas
 * del barbero) en vez de solo el resultado final — para ver en cuál paso
 * se desvía. Borrar este archivo una vez resuelto.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const barberIdRaw = typeof req.query.barberId === "string" ? req.query.barberId : undefined;
    const date = typeof req.query.date === "string" ? req.query.date : undefined;

    if (!date) {
      throw new InvalidScheduleInputError("El parámetro 'date' es requerido (YYYY-MM-DD).");
    }
    assertValidDate(date);
    if (!barberIdRaw || !isBarberId(barberIdRaw)) {
      throw new InvalidScheduleInputError("El parámetro 'barberId' debe ser 'camilo' o 'alejandro'.");
    }

    const supabaseConfigured = isSupabaseConfigured();
    const supabase = getSupabaseAdmin();

    if (!supabaseConfigured || !supabase) {
      res.status(200).json({
        supabaseConfigured,
        supabaseClient: Boolean(supabase),
        note: "Sin Supabase disponible: getEffectiveHours usaría el horario fijo de respaldo (10am-9pm todos los días).",
      });
      return;
    }

    const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();

    const { data: exceptions, error: exceptionsError } = await supabase
      .from("schedule_exceptions")
      .select("barber_id, is_closed, open_time, close_time")
      .eq("date", date)
      .or(`barber_id.eq.${barberIdRaw},barber_id.is.null`);

    const { data: weekly, error: weeklyError } = await supabase
      .from("barber_schedules")
      .select("id, barber_id, day_of_week, is_open, open_time, close_time")
      .eq("barber_id", barberIdRaw)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle();

    // Las 7 filas del barbero, sin filtrar por día — para detectar de un
    // vistazo duplicados o un día de la semana desalineado.
    const { data: allWeekly, error: allWeeklyError } = await supabase
      .from("barber_schedules")
      .select("id, barber_id, day_of_week, is_open, open_time, close_time")
      .eq("barber_id", barberIdRaw)
      .order("day_of_week", { ascending: true });

    res.status(200).json({
      input: { barberId: barberIdRaw, date },
      dayOfWeekCalculado: dayOfWeek,
      excepciones: { data: exceptions, error: exceptionsError?.message ?? null },
      horarioDelDiaPuntual: { data: weekly, error: weeklyError?.message ?? null },
      horarioCompletoDelBarbero: { data: allWeekly, error: allWeeklyError?.message ?? null },
    });
  } catch (error) {
    sendApiError(res, error);
  }
}
