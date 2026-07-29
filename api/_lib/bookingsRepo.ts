import { getSupabaseAdmin } from "./supabaseAdmin.js";
import type { Service } from "../../src/data/services.js";

/**
 * Persistencia de reservas en Supabase.
 *
 * Regla de oro de este módulo: Supabase es la fuente de verdad, pero
 * un fallo suyo NUNCA debe impedir que el cliente reserve. Por eso
 * todas las funciones capturan sus errores, los registran y devuelven
 * un valor neutro en vez de propagar la excepción. Si Supabase no está
 * configurado, se comportan como no-ops y el sistema funciona
 * exactamente como antes de RED CLUB.
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

/** Crea la reserva en estado 'pending', antes de tocar Google Calendar.
 * Devuelve el id, o null si Supabase no está disponible. */
export async function createBookingRecord(input: CreateBookingInput): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

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
      console.error("No se pudo crear la reserva en Supabase:", error?.message);
      return null;
    }

    const bookingId = data.id as string;

    // Snapshot de los servicios: el historial del cliente no debe
    // cambiar si mañana se edita el catálogo o sube un precio.
    const rows = input.services.map((service, index) => ({
      booking_id: bookingId,
      service_id: service.id,
      name_snapshot: service.name,
      price_cop_snapshot: parsePrice(service.price),
      duration_minutes_snapshot: service.durationMinutes,
      position: index,
    }));

    if (rows.length > 0) {
      const { error: servicesError } = await supabase.from("booking_services").insert(rows);
      if (servicesError) {
        console.error("No se pudieron guardar los servicios:", servicesError.message);
      }
    }

    return bookingId;
  } catch (error) {
    console.error("Error inesperado creando la reserva en Supabase:", error);
    return null;
  }
}

/** Confirma la reserva una vez creado el evento en Google Calendar. */
export async function attachGoogleEvent(bookingId: string, googleEventId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("bookings")
      .update({
        google_event_id: googleEventId,
        google_calendar_synced: true,
        status: "confirmed",
      })
      .eq("id", bookingId);

    if (error) console.error("No se pudo enlazar el evento de Calendar:", error.message);
  } catch (error) {
    console.error("Error inesperado enlazando el evento de Calendar:", error);
  }
}

/** Si Google Calendar falló, la reserva no debe quedar viva en la base
 * ocupando un horario que en realidad está libre. */
export async function discardBooking(bookingId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (error) console.error("No se pudo descartar la reserva:", error.message);
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
