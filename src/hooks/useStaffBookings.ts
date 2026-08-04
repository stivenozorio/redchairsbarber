import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "../lib/supabase";
import type { BookingRow, BookingServiceRow } from "../types/club";
import { useAuth } from "../auth/useAuth";

const STAFF_COLUMNS =
  "id, user_id, barber_id, status, starts_at, ends_at, total_price_cop, total_duration_minutes, customer_name, notes, google_event_id, created_at, source";

/**
 * Reservas para el panel administrativo y el panel del barbero — mismo
 * patrón que useMyBookings (dos consultas simples en vez de una relación
 * embebida, que depende del cache de esquema de PostgREST), pero con
 * filtros de fecha/barbero/búsqueda en vez de estar atado a un usuario.
 *
 * El acotamiento por barbero es solo el filtro por defecto de la
 * pantalla: la seguridad real de qué puede LEER cada rol la sigue
 * dando RLS (is_staff() ya permite a barberos y admins ver todas las
 * reservas); lo que sí está protegido de verdad es la ESCRITURA, que
 * pasa por /api/staff/booking-status y ahí sí se verifica que un
 * barbero solo cambie el estado de sus propias citas.
 */
export interface StaffBookingsFilters {
  /** Omitir o "any" = todos los barberos. */
  barberId?: string;
  /** ISO, inclusive. */
  dateFrom?: string;
  /** ISO, exclusivo. */
  dateTo?: string;
  /** Nombre o teléfono del cliente. */
  search?: string;
  limit?: number;
  ascending?: boolean;
}

interface UseStaffBookingsResult {
  bookings: BookingRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setBookings: Dispatch<SetStateAction<BookingRow[]>>;
}

export function useStaffBookings(filters: StaffBookingsFilters): UseStaffBookingsResult {
  const { barberId, dateFrom, dateTo, search, limit = 200, ascending = false } = filters;
  const { isAdmin } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // customer_phone solo se pide para un admin: un barbero (posiblemente
    // temporal) no debe poder ver ni copiar el teléfono del cliente.
    let query = supabase
      .from("bookings")
      .select(isAdmin ? `${STAFF_COLUMNS}, customer_phone` : STAFF_COLUMNS)
      .order("starts_at", { ascending })
      .limit(limit);

    if (barberId && barberId !== "any") query = query.eq("barber_id", barberId);
    if (dateFrom) query = query.gte("starts_at", dateFrom);
    if (dateTo) query = query.lt("starts_at", dateTo);
    const term = search?.trim();
    if (term) {
      const escaped = term.replace(/[%,]/g, "");
      query = query.or(`customer_name.ilike.%${escaped}%,customer_phone.ilike.%${escaped}%`);
    }

    const { data: bookingRows, error: bookingsError } = await query;

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

    const { data: serviceRows } = await supabase
      .from("booking_services")
      .select(
        "id, booking_id, service_id, name_snapshot, price_cop_snapshot, duration_minutes_snapshot, position"
      )
      .in(
        "booking_id",
        rows.map((b) => b.id)
      );

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
        booking_services: (byBooking.get(booking.id) ?? []).sort((a, b) => a.position - b.position),
      }))
    );
    setLoading(false);
  }, [barberId, dateFrom, dateTo, search, limit, ascending, isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  return { bookings, loading, error, reload: load, setBookings };
}
