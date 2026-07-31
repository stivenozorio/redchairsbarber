import { FaCalendarAlt, FaClock, FaUser } from "react-icons/fa";
import type { BookingRow } from "../../types/club";
import { BARBERS } from "../../data/booking";
import { BOOKING_STATUS_CLASS, BOOKING_STATUS_LABEL } from "../../data/bookingStatus";
import { formatCop, formatLongDate, formatTime } from "../../lib/format";

function barberName(barberId: string): string {
  return BARBERS.find((b) => b.id === barberId)?.name ?? barberId;
}

export default function BookingCard({
  booking,
  highlight = false,
}: {
  booking: BookingRow;
  highlight?: boolean;
}) {
  const services = (booking.booking_services ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

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
    </div>
  );
}
