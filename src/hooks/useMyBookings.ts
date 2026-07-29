import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { BookingRow, BookingServiceRow } from "../types/club";

interface UseMyBookingsResult {
  upcoming: BookingRow[];
  past: BookingRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Reservas del usuario autenticado.
 *
 * Se consulta en dos pasos en lugar de usar una relación embebida
 * (`bookings(*, booking_services(*))`). La versión embebida depende de
 * que PostgREST tenga la relación en su cache de esquema; si el cache
 * está desactualizado tras correr las migraciones, la consulta falla
 * entera con "Could not find a relationship". Dos consultas simples son
 * inmunes a eso.
 *
 * El filtro por usuario es explícito Y está respaldado por Row Level
 * Security en la base: aunque alguien manipule el cliente, solo
 * recibirá sus propias filas.
 */
export function useMyBookings(userId: string | undefined): UseMyBookingsResult {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !userId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: bookingRows, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        "id, user_id, barber_id, status, starts_at, ends_at, total_price_cop, " +
          "total_duration_minutes, customer_name, customer_phone, notes, " +
          "google_event_id, created_at"
      )
      .eq("user_id", userId)
      .order("starts_at", { ascending: false });

    if (bookingsError) {
      console.error("Error cargando reservas:", bookingsError);
      setError(`No pudimos cargar tus reservas: ${bookingsError.message}`);
      setBookings([]);
      setLoading(false);
      return;
    }

    const rows = (bookingRows as unknown as BookingRow[]) ?? [];

    if (rows.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // Los servicios son informativos: si fallan, se muestran las
    // reservas igual en vez de dejar la pantalla en error.
    const { data: serviceRows, error: servicesError } = await supabase
      .from("booking_services")
      .select(
        "id, booking_id, service_id, name_snapshot, price_cop_snapshot, " +
          "duration_minutes_snapshot, position"
      )
      .in(
        "booking_id",
        rows.map((b) => b.id)
      );

    if (servicesError) {
      console.error("Error cargando los servicios de las reservas:", servicesError);
    }

    const byBooking = new Map<string, BookingServiceRow[]>();
    const serviceList =
      (serviceRows as unknown as (BookingServiceRow & { booking_id: string })[]) ?? [];
    for (const row of serviceList) {
      const list = byBooking.get(row.booking_id) ?? [];
      list.push(row);
      byBooking.set(row.booking_id, list);
    }

    setBookings(
      rows.map((booking) => ({
        ...booking,
        booking_services: (byBooking.get(booking.id) ?? []).sort(
          (a, b) => a.position - b.position
        ),
      }))
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const now = Date.now();
  const isLive = (b: BookingRow) => b.status !== "cancelled" && b.status !== "no_show";

  const upcoming = bookings
    .filter((b) => isLive(b) && new Date(b.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const past = bookings.filter((b) => !isLive(b) || new Date(b.starts_at).getTime() < now);

  return { upcoming, past, loading, error, reload: load };
}
