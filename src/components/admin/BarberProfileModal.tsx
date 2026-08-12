import { useEffect } from "react";
import { FaSpinner, FaTimes } from "react-icons/fa";
import { useBarberBookingHistory } from "../../hooks/useBarberBookingHistory";
import { BOOKING_STATUS_LABEL } from "../../data/bookingStatus";
import { formatCop, formatShortDate, formatTime } from "../../lib/format";

/**
 * Ficha del barbero, abierta desde /admin/barberos: su historial de
 * reservas atendidas. A diferencia de ClientProfileModal, no muestra
 * puntos ni nivel (eso es propio de una cuenta de cliente, no de un
 * barbero) — solo el historial de citas que se le asignaron.
 */
export default function BarberProfileModal({
  barberId,
  barberName,
  onClose,
}: {
  barberId: string;
  barberName: string;
  onClose: () => void;
}) {
  const { bookings, loading, error } = useBarberBookingHistory(barberId);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const counts = {
    total: bookings.length,
    completadas: bookings.filter((b) => b.status === "completed").length,
    canceladas: bookings.filter((b) => b.status === "cancelled").length,
    noAsistio: bookings.filter((b) => b.status === "no_show").length,
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-obsidian/80 p-4 py-12 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="card-lux w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-xl text-ivory">{barberName}</p>
            <p className="mt-1 text-sm text-bone/60">Historial de reservas</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 text-bone/50 transition-colors hover:text-gold"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {!loading && !error && bookings.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-widest2 text-bone/60">
            <span className="rounded-sm border border-gold/20 px-3 py-1">
              {counts.total} en total
            </span>
            <span className="rounded-sm border border-gold/20 px-3 py-1 text-gold">
              {counts.completadas} completadas
            </span>
            <span className="rounded-sm border border-gold/20 px-3 py-1">
              {counts.canceladas} canceladas
            </span>
            <span className="rounded-sm border border-gold/20 px-3 py-1">
              {counts.noAsistio} no asistió
            </span>
          </div>
        )}

        <div className="mt-6 border-t border-gold/10 pt-4">
          <p className="eyebrow justify-start before:hidden">
            {`Últimas ${bookings.length > 0 ? bookings.length : ""} reservas`.trim()}
          </p>
          <div className="mt-3 max-h-96 space-y-3 overflow-y-auto">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-bone/50">
                <FaSpinner className="animate-spin" /> Cargando historial...
              </p>
            ) : error ? (
              <p className="text-sm text-blood">{error}</p>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-bone/50">Todavía no tiene reservas registradas.</p>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="border-b border-gold/10 pb-3 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-ivory/90">{b.customer_name}</p>
                      <p className="mt-0.5 text-xs text-bone/50">
                        {(b.booking_services ?? []).map((s) => s.name_snapshot).join(" + ") ||
                          "Sin servicios registrados"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-bone/50">
                      <p>{formatShortDate(b.starts_at)}</p>
                      <p>{formatTime(b.starts_at)}</p>
                    </div>
                  </div>
                  <p className="mt-1.5 flex items-center gap-2 text-xs uppercase tracking-widest2">
                    <span className="text-gold/70">{BOOKING_STATUS_LABEL[b.status]}</span>
                    <span className="text-bone/40">·</span>
                    <span className="text-bone/50">{formatCop(b.total_price_cop)}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
