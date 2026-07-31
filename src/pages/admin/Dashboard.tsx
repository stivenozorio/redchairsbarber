import { useCallback, useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import type { BookingRow } from "../../types/club";
import AdminBookingRow from "../../components/admin/AdminBookingRow";

/** Rango de "hoy" en hora de Bogotá (offset fijo -05:00, sin horario de
 * verano — igual que api/_lib/schedule.ts en el servidor). */
function todayBogotaRange() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const nextDay = new Date(`${parts}T00:00:00-05:00`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return {
    dateStr: parts,
    startISO: `${parts}T00:00:00-05:00`,
    endISO: nextDay.toISOString(),
  };
}

export default function AdminDashboard() {
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
    const { startISO, endISO } = todayBogotaRange();
    const { data, error: fetchError } = await supabase
      .from("bookings")
      .select(
        "id, user_id, barber_id, status, starts_at, ends_at, total_price_cop, total_duration_minutes, customer_name, customer_phone, notes, google_event_id, created_at"
      )
      .gte("starts_at", startISO)
      .lt("starts_at", endISO)
      .order("starts_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setBookings([]);
    } else {
      setBookings((data as unknown as BookingRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleChanged = (updated: BookingRow) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const now = Date.now();
  const counts = {
    total: bookings.length,
    proximas: bookings.filter(
      (b) => new Date(b.starts_at).getTime() >= now && !["cancelled", "no_show", "completed"].includes(b.status)
    ).length,
    completadas: bookings.filter((b) => b.status === "completed").length,
    canceladas: bookings.filter((b) => b.status === "cancelled").length,
    noAsistio: bookings.filter((b) => b.status === "no_show").length,
  };

  const tiles = [
    { label: "Citas de hoy", value: counts.total },
    { label: "Próximas citas", value: counts.proximas },
    { label: "Completadas", value: counts.completadas },
    { label: "Canceladas", value: counts.canceladas },
    { label: "No asistieron", value: counts.noAsistio },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="card-lux text-center">
            <p className="font-display text-4xl text-gold">{tile.value}</p>
            <p className="mt-2 text-xs uppercase tracking-widest2 text-bone/60">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <p className="eyebrow justify-start before:hidden">Agenda de hoy</p>
        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-bone/60">
              <FaSpinner className="animate-spin text-gold" /> Cargando...
            </p>
          ) : error ? (
            <p className="text-sm text-blood">No se pudo cargar la agenda: {error}</p>
          ) : bookings.length === 0 ? (
            <div className="card-lux">
              <p className="text-sm text-bone/70">No hay citas programadas para hoy.</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <AdminBookingRow key={booking.id} booking={booking} onChanged={handleChanged} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
