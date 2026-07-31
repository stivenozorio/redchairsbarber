import { useState } from "react";
import { FaCheck, FaExclamationTriangle, FaSpinner, FaUser } from "react-icons/fa";
import type { BookingRow, BookingStatus } from "../../types/club";
import { BOOKING_STATUS_CLASS, BOOKING_STATUS_LABEL, BOOKING_STATUS_ORDER } from "../../data/bookingStatus";
import { BARBERS } from "../../data/booking";
import { formatCop, formatShortDate, formatTime } from "../../lib/format";
import { useUpdateBookingStatus } from "../../hooks/useUpdateBookingStatus";

function barberName(barberId: string): string {
  return BARBERS.find((b) => b.id === barberId)?.name ?? barberId;
}

const DONE_STATUSES: BookingStatus[] = ["completed", "cancelled"];

/** Fila de reserva reutilizada por el panel administrativo y el panel
 * del barbero: mismo componente, mismo endpoint de cambio de estado
 * (/api/staff/booking-status), solo cambia qué reservas le llegan. */
export default function BookingStatusRow({
  booking,
  onChanged,
  onOpenClient,
}: {
  booking: BookingRow;
  onChanged: (updated: BookingRow) => void;
  /** Si se da y la reserva tiene cuenta (user_id), se muestra "Ver cliente". */
  onOpenClient?: (userId: string) => void;
}) {
  const { updateStatus, updatingId } = useUpdateBookingStatus();
  const [error, setError] = useState<string | null>(null);
  const saving = updatingId === booking.id;
  const services = (booking.booking_services ?? []).slice().sort((a, b) => a.position - b.position);

  const handleChange = async (status: BookingStatus) => {
    setError(null);
    const result = await updateStatus(booking.id, status);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChanged({ ...booking, status });
  };

  return (
    <div className="card-lux flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-lg text-ivory">{booking.customer_name}</p>
          {booking.user_id && onOpenClient && (
            <button
              type="button"
              onClick={() => onOpenClient(booking.user_id as string)}
              className="flex items-center gap-1.5 text-xs uppercase tracking-widest2 text-gold/70 transition-colors hover:text-gold"
            >
              <FaUser size={10} /> Ver cliente
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-bone/60">{booking.customer_phone}</p>

        {services.length > 0 && (
          <p className="mt-2 text-sm text-bone/70">{services.map((s) => s.name_snapshot).join(" + ")}</p>
        )}

        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-widest2 text-bone/50">
          <span>{formatShortDate(booking.starts_at)}</span>
          <span>{formatTime(booking.starts_at)}</span>
          <span>{barberName(booking.barber_id)}</span>
          <span>{booking.total_duration_minutes} min</span>
          <span className="text-gold/70">{formatCop(booking.total_price_cop)}</span>
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <div className="flex items-center gap-2">
          {saving && <FaSpinner className="animate-spin text-gold" size={12} />}
          <select
            value={booking.status}
            disabled={saving}
            onChange={(e) => void handleChange(e.target.value as BookingStatus)}
            className={`rounded-sm border bg-obsidian px-3 py-2 text-xs uppercase tracking-widest2 focus:outline-none disabled:opacity-50 ${BOOKING_STATUS_CLASS[booking.status]}`}
          >
            {BOOKING_STATUS_ORDER.map((status) => (
              <option key={status} value={status} className="bg-obsidian text-ivory">
                {BOOKING_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </div>

        {!DONE_STATUSES.includes(booking.status) && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleChange("completed")}
            className="btn-gold !py-2 !px-4 text-xs disabled:opacity-50"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaCheck size={11} />}
            <span className="ml-2">Marcar como completada</span>
          </button>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-blood">
            <FaExclamationTriangle size={10} /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
