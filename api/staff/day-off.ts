import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireStaffUserId, StaffAuthError } from "../_lib/auth.js";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin.js";
import { isBarberId } from "../_lib/googleCalendar.js";
import { assertValidDate, InvalidScheduleInputError } from "../_lib/schedule.js";
import { sendApiError } from "../_lib/http.js";

/**
 * Bloquea (o desbloquea) un día completo de la agenda de un barbero —
 * "no voy a trabajar ese día" — a diferencia de bloquear una sola hora
 * (api/staff/block-slot.ts), esto NO crea ningún evento en Google
 * Calendar: /api/availability ya consulta schedule_exceptions (Fase 2)
 * para decidir si un barbero atiende ese día, así que basta con la
 * fila en Supabase para que el sitio público deje de ofrecer horas ese
 * día con ese barbero.
 *
 * Un barbero solo puede bloquear/desbloquear su propia agenda; un
 * admin puede hacerlo para cualquiera (mismo criterio que
 * booking-status.ts y block-slot.ts).
 *
 * A propósito NO cancela citas que ya existan ese día — mismo
 * comportamiento que las excepciones que ya crea un admin desde
 * /admin/horarios. Si el barbero ya tiene citas agendadas, debe
 * cancelarlas o reprogramarlas aparte; el panel se lo advierte antes
 * de confirmar.
 */

interface RequestBody {
  barberId?: string;
  date?: string;
  note?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const identity = await requireStaffUserId(req);
    const { barberId: bodyBarberId, date, note } = (req.body ?? {}) as RequestBody;

    let barberId: string;
    if (identity.role === "barber") {
      if (!identity.barberId) {
        throw new StaffAuthError(
          "Tu cuenta todavía no está vinculada a ningún barbero. Pide que un administrador te vincule.",
          403
        );
      }
      barberId = identity.barberId;
    } else {
      if (!bodyBarberId || !isBarberId(bodyBarberId)) {
        throw new InvalidScheduleInputError("Selecciona un barbero válido.");
      }
      barberId = bodyBarberId;
    }

    if (!date || typeof date !== "string") {
      throw new InvalidScheduleInputError("El campo 'date' es requerido (YYYY-MM-DD).");
    }
    assertValidDate(date);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      res.status(500).json({ error: "Supabase no está configurado." });
      return;
    }

    const { data: existing, error: fetchError } = await supabase
      .from("schedule_exceptions")
      .select("id, is_closed")
      .eq("barber_id", barberId)
      .eq("date", date)
      .maybeSingle();

    if (fetchError) {
      res.status(500).json({ error: fetchError.message });
      return;
    }

    if (req.method === "DELETE") {
      // Solo se quita si de verdad es un día bloqueado por esta misma
      // función — no se toca una excepción de "horario especial" que
      // haya configurado un admin (is_closed = false).
      if (!existing || !existing.is_closed) {
        res.status(200).json({ success: true });
        return;
      }
      const { error: deleteError } = await supabase
        .from("schedule_exceptions")
        .delete()
        .eq("id", existing.id);
      if (deleteError) {
        res.status(500).json({ error: deleteError.message });
        return;
      }
      res.status(200).json({ success: true });
      return;
    }

    const trimmedNote = typeof note === "string" ? note.trim() : "";

    if (existing) {
      const { error: updateError } = await supabase
        .from("schedule_exceptions")
        .update({ is_closed: true, open_time: null, close_time: null, note: trimmedNote || null })
        .eq("id", existing.id);
      if (updateError) {
        res.status(500).json({ error: updateError.message });
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("schedule_exceptions").insert({
        barber_id: barberId,
        date,
        is_closed: true,
        note: trimmedNote || null,
      });
      if (insertError) {
        res.status(500).json({ error: insertError.message });
        return;
      }
    }

    res.status(200).json({ success: true, barberId, date });
  } catch (error) {
    sendApiError(res, error);
  }
}
