import { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { useStaffBookings } from "../../hooks/useStaffBookings";
import { todayBogotaRange } from "../../lib/format";
import BookingStatusRow from "../../components/staff/BookingStatusRow";
import ClientProfileModal from "../../components/staff/ClientProfileModal";

export default function AdminDashboard() {
  const { startISO, endISO } = todayBogotaRange();
  const { bookings, loading, error, setBookings } = useStaffBookings({
    dateFrom: startISO,
    dateTo: endISO,
    ascending: true,
    limit: 500,
  });
  const [clientId, setClientId] = useState<string | null>(null);

  const handleChanged = (updated: (typeof bookings)[number]) => {
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
              <BookingStatusRow
                key={booking.id}
                booking={booking}
                onChanged={handleChanged}
                onOpenClient={setClientId}
              />
            ))
          )}
        </div>
      </div>

      {clientId && <ClientProfileModal userId={clientId} onClose={() => setClientId(null)} />}
    </div>
  );
}
