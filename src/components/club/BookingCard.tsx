import { useState, type FormEvent } from "react";
import { FaCalendarAlt, FaClock, FaExchangeAlt, FaExclamationTriangle, FaUser } from "react-icons/fa";
import type { BookingRow } from "../../types/club";
import { BARBERS, TIME_SLOTS } from "../../data/booking";
import { BOOKING_STATUS_CLASS, BOOKING_STATUS_LABEL } from "../../data/bookingStatus";
import { formatCop, formatLongDate, formatTime } from "../../lib/format";
import { fieldClass, labelClass } from "../../lib/ui";
import { useMyBookingActions } from "../../hooks/useMyBookingActions";

function barberName(barberId: string): string {
  return BARBERS.find((b) => b.id === barberId)?.name ?? barberId;
}

/** Solo tiene sentido reagendar/cancelar una cita que todavía no pasó
 * ni empezó — no una completada, cancelada, sin asistencia, o que el
 * barbero ya marcó "en proceso". */
const EDITABLE_STATUSES = ["pending", "confirmed"];

export default function BookingCard({
  booking,
  highlight = false,
  onUpdated,
}: {
  booking: BookingRow;
  highlight?: boolean;
  /** Se llama tras cancelar o reprogramar con éxito, para que la lista
   * de reservas de "Mi cuenta" se recargue. */
  onUpdated?: () => void;
}) {
  const services = (booking.booking_services ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  const { cancelBooking, rescheduleBooking, cancelling, rescheduling } = useMyBookingActions();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [date, setDate] = useState(() => booking.starts_at.slice(0, 10));
  const [time, setTime] = useState(TIME_SLOTS[0]);
  const [error, setError] = useState<string | null>(null);

  const canManage = EDITABLE_STATUSES.includes(booking.status) && Boolean(booking.google_event_id);

  const handleCancel = async () => {
    if (!booking.google_event_id) return;
    if (!window.confirm("¿Seguro que quieres cancelar esta reserva?")) return;
    setError(null);
    const result = await cancelBooking(booking.google_event_id, booking.barber_id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUpdated?.();
  };

  const handleReschedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!booking.google_event_id) return;
    setError(null);
    const result = await rescheduleBooking(booking.google_event_id, booking.barber_id, date, time);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRescheduleOpen(false);
    onUpdated?.();
  };

  return (
    <div className={`card-lux ${highlight ? "border-gold/40" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-lg capitalize text-ivory">
            {formatLongDate(booking.starts_at)}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-bone/70">
            <span className="flex items-center gap-2">
              <FaClock className="text-gold/70" size={12} /> {formatTime(booking.starts_at)}
            </span>
            <span className="flex items-center gap-2">
              <FaUser className="text-gold/70" size={12} /> {barberName(booking.barber_id)}
            </span>
            {booking.redeemed_with_points && (
              <span className="flex items-center gap-1.5 text-gold">
                <FaExchangeAlt size={11} /> Canjeado con {booking.points_redeemed} puntos
              </span>
            )}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-4 py-1 text-[10px] uppercase tracking-widest2 ${
            BOOKING_STATUS_CLASS[booking.status]
          }`}
        >
          {BOOKING_STATUS_LABEL[booking.status]}
        </span>
      </div>

      {services.length > 0 && (
        <ul className="mt-5 space-y-1.5 border-t border-gold/10 pt-5">
          {services.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-bone/80">{s.name_snapshot}</span>
              <span className="shrink-0 text-bone/50">{formatCop(s.price_cop_snapshot)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-gold/10 pt-4">
        <span className="flex items-center gap-2 text-xs uppercase tracking-widest2 text-bone/50">
          <FaCalendarAlt className="text-gold/60" size={11} />
          {booking.total_duration_minutes} min
        </span>
        <span className="font-display text-lg text-gold">{formatCop(booking.total_price_cop)}</span>
      </div>

      {canManage && (
        <div className="mt-5 border-t border-gold/10 pt-5">
          {!rescheduleOpen ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setRescheduleOpen(true);
                }}
                className="btn-outline !px-5 !py-3 text-[11px]"
              >
                Reagendar
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void handleCancel()}
                className="btn-outline !border-blood/50 !px-5 !py-3 text-[11px] !text-blood hover:!bg-blood/10 disabled:opacity-50"
              >
                {cancelling ? "Cancelando..." : "Cancelar"}
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleReschedule(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nueva fecha</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Nueva hora</label>
                  <select value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass}>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="btn-gold !px-5 !py-3 text-[11px] disabled:opacity-50"
                >
                  {rescheduling ? "Guardando..." : "Confirmar nuevo horario"}
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduleOpen(false)}
                  className="btn-outline !px-5 !py-3 text-[11px]"
                >
                  Cancelar cambio
                </button>
              </div>
            </form>
          )}

          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-blood">
              <FaExclamationTriangle size={10} /> {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
