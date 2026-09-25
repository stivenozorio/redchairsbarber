import { useState } from "react";
import { FaBan, FaCheck, FaClock, FaExchangeAlt, FaExclamationTriangle, FaSpinner, FaUser } from "react-icons/fa";
import type { BookingRow, BookingStatus } from "../../types/club";
import { BOOKING_STATUS_CLASS, BOOKING_STATUS_LABEL, BOOKING_STATUS_ORDER } from "../../data/bookingStatus";
import { BARBERS } from "../../data/booking";
import { formatCop, formatShortDate, formatTime } from "../../lib/format";
import { useUpdateBookingStatus } from "../../hooks/useUpdateBookingStatus";
import { useAuth } from "../../auth/useAuth";

function barberName(barberId: string): string {
  return BARBERS.find((b) => b.id === barberId)?.name ?? barberId;
}

const DONE_STATUSES: BookingStatus[] = ["completed", "cancelled"];

/** Bloqueos (source === 'blocked', ver api/staff/block-slot.ts) no son
 * citas reales: se muestran con su propia fila, mucho más simple, y un
 * único botón "Desbloquear" en vez del selector de estado completo. */
function BlockedSlotRow({ booking, onChanged }: { booking: BookingRow; onChanged: (updated: BookingRow) => void }) {
  const { updateStatus, updatingId } = useUpdateBookingStatus();
  const [error, setError] = useState<string | null>(null);
  const saving = updatingId === booking.id;

  const handleUnblock = async () => {
    setError(null);
    const result = await updateStatus(booking.id, "cancelled");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onChanged({ ...booking, status: "cancelled" });
  };

  if (booking.status === "cancelled") return null;

  return (
    <div className="card-lux flex flex-col gap-4 border-bone/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-display text-lg text-bone/70">
          <FaBan size={14} className="text-bone/40" /> Bloqueado
        </p>
        {booking.notes && <p className="mt-1 text-sm text-bone/60">{booking.notes}</p>}
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-widest2 text-bone/50">
          <span>{formatShortDate(booking.starts_at)}</span>
          <span>{formatTime(booking.starts_at)}</span>
          <span>{barberName(booking.barber_id)}</span>
          <span>{booking.total_duration_minutes} min</span>
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleUnblock()}
          className="btn-outline !py-2 !px-4 text-xs disabled:opacity-50"
        >
          {saving ? <FaSpinner className="animate-spin" /> : <FaBan size={11} />}
          <span className="ml-2">Desbloquear</span>
        </button>
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-blood">
            <FaExclamationTriangle size={10} /> {error}
          </p>
        )}
      </div>
    </div>
  );
}

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
  const { updateStatus, updateDuration, updatingId } = useUpdateBookingStatus();
  const { isAdmin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationInput, setDurationInput] = useState(String(booking.total_duration_minutes));
  const [durationError, setDurationError] = useState<string | null>(null);
  const saving = updatingId === booking.id;
  const services = (booking.booking_services ?? []).slice().sort((a, b) => a.position - b.position);

  if (booking.source === "blocked") {
    return <BlockedSlotRow booking={booking} onChanged={onChanged} />;
  }

  const handleChange = async (status: BookingStatus) => {
    setError(null);
    setWarning(null);
    const result = await updateStatus(booking.id, status);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.warning) setWarning(result.warning);
    onChanged({ ...booking, status });
  };

  // El barbero a veces se demora más (o menos) de lo previsto con el
  // corte — esto mueve SOLO el fin de la cita en Calendar, sin tocar la
  // hora de inicio. El servidor rechaza el ajuste si choca con la cita
  // siguiente (ver api/staff/booking-status.ts).
  const startEditingDuration = () => {
    setDurationInput(String(booking.total_duration_minutes));
    setDurationError(null);
    setEditingDuration(true);
  };

  const handleSaveDuration = async () => {
    const minutes = Math.round(Number(durationInput));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setDurationError("Ingresa un número de minutos válido.");
      return;
    }
    setDurationError(null);
    const result = await updateDuration(booking.id, minutes);
    if (!result.ok) {
      setDurationError(result.error);
      return;
    }
    onChanged({ ...booking, total_duration_minutes: minutes });
    setEditingDuration(false);
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
        {/* Un barbero temporal no debe poder ver/copiar el teléfono del
         * cliente — solo el administrador. Ver README ("Privacidad del
         * teléfono frente al panel del barbero") para el alcance real
         * de esta restricción. */}
        {isAdmin && <p className="mt-1 text-sm text-bone/60">{booking.customer_phone}</p>}

        {services.length > 0 && (
          <p className="mt-2 text-sm text-bone/70">{services.map((s) => s.name_snapshot).join(" + ")}</p>
        )}

        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-widest2 text-bone/50">
          <span>{formatShortDate(booking.starts_at)}</span>
          <span>{formatTime(booking.starts_at)}</span>
          <span>{barberName(booking.barber_id)}</span>
          <span>{booking.total_duration_minutes} min</span>
          <span className="text-gold/70">{formatCop(booking.total_price_cop)}</span>
          {booking.redeemed_with_points && (
            <span className="flex items-center gap-1.5 rounded-full border border-gold/30 px-2.5 py-0.5 text-gold">
              <FaExchangeAlt size={10} /> Canjeado ({booking.points_redeemed} pts)
            </span>
          )}
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

        {booking.status !== "cancelled" && (
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            {editingDuration ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  disabled={saving}
                  className="w-20 rounded-sm border border-gold/20 bg-obsidian px-2 py-1.5 text-xs text-ivory focus:border-gold focus:outline-none disabled:opacity-50"
                />
                <span className="text-xs text-bone/50">min</span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveDuration()}
                  className="text-xs uppercase tracking-widest2 text-gold transition-colors hover:text-gold-light disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditingDuration(false)}
                  className="text-xs uppercase tracking-widest2 text-bone/50 transition-colors hover:text-bone/80 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditingDuration}
                className="flex items-center gap-1.5 text-xs uppercase tracking-widest2 text-bone/50 transition-colors hover:text-gold"
              >
                <FaClock size={10} /> Ajustar duración
              </button>
            )}
            {durationError && (
              <p className="flex items-center gap-1.5 text-xs text-blood">
                <FaExclamationTriangle size={10} /> {durationError}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-blood">
            <FaExclamationTriangle size={10} /> {error}
          </p>
        )}
        {warning && (
          <p className="flex max-w-xs items-center gap-1.5 text-right text-xs text-gold">
            <FaExclamationTriangle size={10} /> {warning}
          </p>
        )}
      </div>
    </div>
  );
}
