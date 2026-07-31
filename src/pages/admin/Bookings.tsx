import { useCallback, useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import type { BookingRow } from "../../types/club";
import { BARBERS } from "../../data/booking";
import { fieldClass, labelClass } from "../../lib/ui";
import AdminBookingRow from "../../components/admin/AdminBookingRow";

const RESULT_LIMIT = 200;

export default function AdminBookings() {
  const [date, setDate] = useState("");
  const [barberId, setBarberId] = useState("any");
  const [search, setSearch] = useState("");

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

    let query = supabase
      .from("bookings")
      .select(
        "id, user_id, barber_id, status, starts_at, ends_at, total_price_cop, total_duration_minutes, customer_name, customer_phone, notes, google_event_id, created_at"
      )
      .order("starts_at", { ascending: false })
      .limit(RESULT_LIMIT);

    if (date) {
      const next = new Date(`${date}T00:00:00-05:00`);
      next.setUTCDate(next.getUTCDate() + 1);
      query = query.gte("starts_at", `${date}T00:00:00-05:00`).lt("starts_at", next.toISOString());
    }
    if (barberId !== "any") {
      query = query.eq("barber_id", barberId);
    }
    const term = search.trim();
    if (term) {
      const escaped = term.replace(/[%,]/g, "");
      query = query.or(`customer_name.ilike.%${escaped}%,customer_phone.ilike.%${escaped}%`);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setBookings([]);
    } else {
      setBookings((data as unknown as BookingRow[]) ?? []);
    }
    setLoading(false);
  }, [date, barberId, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleChanged = (updated: BookingRow) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Barbero</label>
          <select value={barberId} onChange={(e) => setBarberId(e.target.value)} className={fieldClass}>
            {BARBERS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id === "any" ? "Todos" : b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Buscar cliente</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o teléfono"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-bone/60">
            <FaSpinner className="animate-spin text-gold" /> Cargando reservas...
          </p>
        ) : error ? (
          <p className="text-sm text-blood">No se pudieron cargar las reservas: {error}</p>
        ) : bookings.length === 0 ? (
          <div className="card-lux">
            <p className="text-sm text-bone/70">No hay reservas que coincidan con estos filtros.</p>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-widest2 text-bone/50">
              {bookings.length} reserva{bookings.length === 1 ? "" : "s"}
              {bookings.length === RESULT_LIMIT ? " (mostrando las más recientes — filtra para ver más)" : ""}
            </p>
            {bookings.map((booking) => (
              <AdminBookingRow key={booking.id} booking={booking} onChanged={handleChanged} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
