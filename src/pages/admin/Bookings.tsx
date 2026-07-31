import { useMemo, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { BARBERS } from "../../data/booking";
import { fieldClass, labelClass } from "../../lib/ui";
import { useStaffBookings } from "../../hooks/useStaffBookings";
import BookingStatusRow from "../../components/staff/BookingStatusRow";
import ClientProfileModal from "../../components/staff/ClientProfileModal";

const RESULT_LIMIT = 200;

export default function AdminBookings() {
  const [date, setDate] = useState("");
  const [barberId, setBarberId] = useState("any");
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);

  const { dateFrom, dateTo } = useMemo(() => {
    if (!date) return { dateFrom: undefined, dateTo: undefined };
    const next = new Date(`${date}T00:00:00-05:00`);
    next.setUTCDate(next.getUTCDate() + 1);
    return { dateFrom: `${date}T00:00:00-05:00`, dateTo: next.toISOString() };
  }, [date]);

  const { bookings, loading, error, setBookings } = useStaffBookings({
    barberId,
    dateFrom,
    dateTo,
    search,
    limit: RESULT_LIMIT,
  });

  const handleChanged = (updated: (typeof bookings)[number]) => {
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
              <BookingStatusRow
                key={booking.id}
                booking={booking}
                onChanged={handleChanged}
                onOpenClient={setClientId}
              />
            ))}
          </>
        )}
      </div>

      {clientId && <ClientProfileModal userId={clientId} onClose={() => setClientId(null)} />}
    </div>
  );
}
