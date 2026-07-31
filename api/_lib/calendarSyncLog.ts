import { getSupabaseAdmin } from "./supabaseAdmin.js";

/**
 * Registra en `calendar_sync_errors` cuando Supabase se actualizó
 * correctamente pero la sincronización con Google Calendar falló —
 * para que un futuro panel administrativo pueda listar qué reservas
 * quedaron desincronizadas, en vez de depender solo de los logs de
 * Vercel (que se pierden con el tiempo).
 *
 * Nunca lanza: es un registro de auditoría best-effort. Si falla (o
 * Supabase no está configurado), se deja constancia en consola y se
 * sigue — no debe bloquear la respuesta al usuario, que ya recibió su
 * cambio de estado exitoso.
 */
export async function logCalendarSyncError(input: {
  bookingId: string;
  googleEventId: string | null;
  barberId: string | null;
  action?: string;
  errorMessage: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const { error } = await supabase.from("calendar_sync_errors").insert({
      booking_id: input.bookingId,
      google_event_id: input.googleEventId,
      barber_id: input.barberId,
      action: input.action ?? "delete_event",
      error_message: input.errorMessage,
    });
    if (error) {
      console.error("No se pudo registrar el error de sincronización con Calendar:", error);
    }
  } catch (error) {
    console.error("Error inesperado registrando el error de sincronización con Calendar:", error);
  }
}
