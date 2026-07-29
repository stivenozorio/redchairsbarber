import { getSupabaseAdmin, isSupabaseConfigured } from "./supabaseAdmin.js";
import type { Service } from "../../src/data/services.js";

/**
 * Persistencia de reservas en Supabase.
 *
 * Supabase es la FUENTE DE VERDAD. Si está configurado y la escritura
 * falla, la reserva completa se aborta y NO se crea el evento en Google
 * Calendar: es preferible que el cliente reintente a que quede una cita
 * en la agenda del barbero sin registro en la base (imposible de
 * mostrar en "Mi cuenta", de cancelar o de contar para el club).
 *
 * Si Supabase NO está configurado, estas funciones son no-ops y el
 * sistema opera solo contra Calendar, como antes de RED CLUB.
 */

export interface CreateBookingInput {
  userId: string | null;
  barberId: string;
  startISO: string;
  endISO: string;
  totalPriceCop: number;
  totalDurationMinutes: number;
  customerName: string;
  customerPhone: string;
  notes?: string;
  services: Service[];
}

export interface RepoResult {
  /** null = Supabase no está configurado (se opera solo con Calendar). */
  bookingId: string | null;
  error: string | null;
}

/** Traduce errores de Postgres a algo accionable en vez de un código. */
function explainDbError(message: string, details?: string): string {
  const m = `${message} ${details ?? ""}`.toLowerCase();

  if (m.includes("bookings_barber_id_fkey") || (m.includes("barber_id") && m.includes("foreign key"))) {
    return "El barbero no existe en la base de datos. Falta ejecutar la migración 0004_seed.sql en Supabase.";
  }
  if (m.includes("booking_services_service_id_fkey")) {
    return "Un servicio no existe en el catálogo de la base. Falta ejecutar 0004_seed.sql en Supabase.";
  }
  if (m.includes("violates foreign key constraint")) {
    return `Falta un dato relacionado en la base de datos: ${message}`;
  }
  if (m.includes("does not exist") || m.includes("schema cache")) {
    return `La base de datos no está completa: ${message}. Ejecuta las migraciones de supabase/migrations/.`;
  }
  return message;
}

/** Crea la reserva en estado 'pending', ANTES de tocar Google Calendar,
 * junto con sus servicios. Si algo falla, no deja nada a medias. */
export async function createBookingRecord(input: CreateBookingInput): Promise<RepoResult> {
  if (!isSupabaseConfigured()) return { bookingId: null, error: null };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { bookingId: null, error: "No se pudo crear el cliente de Supabase." };

  try {
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        user_id: input.userId,
        barber_id: input.barberId,
        status: "pending",
        starts_at: input.startISO,
        ends_at: input.endISO,
        total_price_cop: input.totalPriceCop,
        total_duration_minutes: input.totalDurationMinutes,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        notes: input.notes?.trim() || null,
        source: "web",
      })
      .select("id")
      .single();

    if (error || !data) {
      const explained = explainDbError(error?.message ?? "error desconocido", error?.details);
      console.error("No se pudo crear la reserva en Supabase:", error);
      return { bookingId: null, error: explained };
    }

    const bookingId = data.id as string;

    // Snapshot de los servicios: el historial del cliente no debe
    // cambiar si mañana se edita el catálogo o sube un precio.
    if (input.services.length > 0) {
      const rows = input.services.map((service, index) => ({
        booking_id: bookingId,
        service_id: service.id,
        name_snapshot: service.name,
        price_cop_snapshot: parsePrice(service.price),
        duration_minutes_snapshot: service.durationMinutes,
        position: index,
      }));

      const { error: servicesError } = await supabase.from("booking_services").insert(rows);

      if (servicesError) {
        // Una reserva sin sus servicios no sirve: se elimina para no
        // dejar un registro incompleto ocupando el horario.
        console.error("No se pudieron guardar los servicios:", servicesError);
        await supabase.from("bookings").delete().eq("id", bookingId);
        return {
          bookingId: null,
          error: explainDbError(servicesError.message, servicesError.details),
        };
      }
    }

    return { bookingId, error: null };
  } catch (error) {
    console.error("Error inesperado creando la reserva en Supabase:", error);
    return {
      bookingId: null,
      error: error instanceof Error ? error.message : "Error inesperado al guardar la reserva.",
    };
  }
}

/** Confirma la reserva una vez creado el evento en Google Calendar. */
export async function attachGoogleEvent(
  bookingId: string,
  googleEventId: string
): Promise<{ error: string | null }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: null };

  try {
    const { error } = await supabase
      .from("bookings")
      .update({
        google_event_id: googleEventId,
        google_calendar_synced: true,
        status: "confirmed",
      })
      .eq("id", bookingId);

    if (error) {
      console.error("No se pudo enlazar el evento de Calendar:", error);
      return { error: error.message };
    }
    return { error: null };
  } catch (error) {
    console.error("Error inesperado enlazando el evento de Calendar:", error);
    return { error: error instanceof Error ? error.message : "Error inesperado." };
  }
}

/** Si Google Calendar falló después de guardar, la reserva no puede
 * quedar viva ocupando un horario que en realidad está libre. */
export async function discardBooking(bookingId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    // Se elimina en vez de cancelar: nunca llegó a existir para el
    // cliente, así que no debe aparecer en su historial.
    await supabase.from("booking_services").delete().eq("booking_id", bookingId);
    await supabase.from("bookings").delete().eq("id", bookingId);
  } catch (error) {
    console.error("Error inesperado descartando la reserva:", error);
  }
}

export async function cancelBookingByEventId(googleEventId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("google_event_id", googleEventId);

    if (error) console.error("No se pudo cancelar la reserva en Supabase:", error.message);
  } catch (error) {
    console.error("Error inesperado cancelando la reserva en Supabase:", error);
  }
}

export async function rescheduleBookingByEventId(
  googleEventId: string,
  startISO: string,
  endISO: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("bookings")
      .update({ starts_at: startISO, ends_at: endISO })
      .eq("google_event_id", googleEventId);

    if (error) console.error("No se pudo reprogramar la reserva en Supabase:", error.message);
  } catch (error) {
    console.error("Error inesperado reprogramando la reserva en Supabase:", error);
  }
}

function parsePrice(price: string): number {
  const digits = price.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}
