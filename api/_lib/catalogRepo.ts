import { getSupabaseAdmin, isSupabaseConfigured } from "./supabaseAdmin.js";
import { isBarberId, type BarberId } from "./googleCalendar.js";
import { ALL_BOOKABLE_SERVICES, formatPriceNumber, type Service } from "../../src/data/services.js";
import { BARBERS } from "../../src/data/booking.js";

/**
 * Catálogo "vivo": precios/duración de servicios y qué barberos están
 * activos, leídos de Supabase para que editarlos desde el panel
 * administrativo tenga efecto real en las reservas nuevas.
 *
 * Si Supabase no está configurado, o el catálogo todavía no tiene datos
 * (o falla la consulta), se cae al catálogo estático embebido en el
 * frontend — la reserva sigue funcionando exactamente como antes de esta
 * fase, igual que con el horario (ver scheduleRepo.ts).
 */

interface ServiceRow {
  id: string;
  name: string;
  price_cop: number;
  duration_minutes: number;
}

export async function getActiveServicesCatalog(): Promise<Service[]> {
  if (!isSupabaseConfigured()) return ALL_BOOKABLE_SERVICES;
  const supabase = getSupabaseAdmin();
  if (!supabase) return ALL_BOOKABLE_SERVICES;

  const { data, error } = await supabase
    .from("services")
    .select("id, name, price_cop, duration_minutes")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return ALL_BOOKABLE_SERVICES;

  return (data as ServiceRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    price: formatPriceNumber(row.price_cop),
    durationMinutes: row.duration_minutes,
  }));
}

interface BarberRow {
  id: string;
  name: string;
}

/** Barberos activos (bookable), en el orden configurado por el panel. Solo
 * puede devolver ids del set fijo BARBER_IDS: agregar un barbero
 * verdaderamente nuevo también requiere su propio calendario de Google
 * (variable de entorno), así que un id desconocido en la base se ignora
 * en vez de intentar reservarlo. */
export async function getActiveBarbers(): Promise<{ id: BarberId; name: string }[]> {
  const fallback = BARBERS.filter((b): b is { id: BarberId; name: string } => isBarberId(b.id));

  if (!isSupabaseConfigured()) return fallback;
  const supabase = getSupabaseAdmin();
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("barbers")
    .select("id, name")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) return fallback;

  const active = (data as BarberRow[]).filter(
    (row): row is BarberRow & { id: BarberId } => isBarberId(row.id)
  );
  return active.length > 0 ? active : fallback;
}

export async function getActiveBarberIds(): Promise<BarberId[]> {
  return (await getActiveBarbers()).map((b) => b.id);
}
