import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { BookingRow, BookingServiceRow } from "../types/club";

const HISTORY_LIMIT = 200;

interface UseBarberBookingHistoryResult {
  bookings: BookingRow[];
  loading: boolean;
  error: string | null;
}

/**
 * Historial de reservas de un barbero, para su ficha en el panel
 * administrativo — mismo patrón de dos consultas que useMyBookings
 * (ver ese archivo), pero filtrado por barber_id en vez de user_id.
 *
 * Excluye los bloqueos de horario (source = 'blocked', ver
 * api/staff/block-slot.ts): esos no son citas reales de un cliente, así
 * que no deben aparecer en el historial de atenciones del barbero.
 */
export function useBarberBookingHistory(barberId: string | null): UseBarberBookingHistoryResult {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !barberId) {
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
          "google_event_id, source, created_at, redeemed_with_points, points_redeemed"
      )
      .eq("barber_id", barberId)
      .neq("source", "blocked")
      .order("starts_at", { ascending: false })
      .limit(HISTORY_LIMIT);

    if (bookingsError) {
      setError(bookingsError.message);
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

    // Los servicios son informativos: si fallan, se muestra el
    // historial igual en vez de dejar la pantalla en error.
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
      console.error("Error cargando los servicios del historial del barbero:", servicesError);
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
  }, [barberId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { bookings, loading, error };
}
