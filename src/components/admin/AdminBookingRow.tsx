import { useState } from "react";
import { FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import type { BookingRow, BookingStatus } from "../../types/club";
import { BOOKING_STATUS_CLASS, BOOKING_STATUS_LABEL, BOOKING_STATUS_ORDER } from "../../data/bookingStatus";
import { BARBERS } from "../../data/booking";
import { formatCop, formatShortDate, formatTime } from "../../lib/format";
import { useUpdateBookingStatus } from "../../hooks/useUpdateBookingStatus";

function barberName(barberId: string): string {
  return BARBERS.find((b) => b.id === barberId)?.name ?? barberId;
}

export default function AdminBookingRow({
  booking,
  onChanged,
}: {
  booking: BookingRow;
  onChanged: (updated: BookingRow) => void;
}) {
  const { updateStatus, updatingId } = useUpdateBookingStatus();
  const [error, setError] = useState<string | null>(null);
  const saving = updatingId === booking.id;

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
    <div className="card-lux flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-display text-lg text-ivory">{booking.customer_name}</p>
        <p className="mt-1 text-sm text-bone/60">{booking.customer_phone}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-widest2 text-bone/50">
          <span>{formatShortDate(booking.starts_at)}</span>
          <span>{formatTime(booking.starts_at)}</span>
          <span>{barberName(booking.barber_id)}</span>
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
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-blood">
            <FaExclamationTriangle size={10} /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
