import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { BookingRow } from "../types/club";

interface UseMyBookingsResult {
  upcoming: BookingRow[];
  past: BookingRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** Reservas del usuario autenticado.
 *
 * No filtra por user_id en la consulta: Row Level Security en Supabase
 * ya garantiza que solo se devuelvan las filas propias. Filtrar aquí
 * daría una falsa sensación de seguridad. */
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

    const { data, error: queryError } = await supabase
      .from("bookings")
      .select("*, booking_services(*)")
      .order("starts_at", { ascending: false });

    if (queryError) {
      setError("No pudimos cargar tus reservas.");
      console.error("Error cargando reservas:", queryError.message);
      setBookings([]);
    } else {
      setBookings((data as BookingRow[]) ?? []);
    }
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
