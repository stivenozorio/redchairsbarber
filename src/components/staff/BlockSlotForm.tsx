import { useState } from "react";
import { FaBan, FaCheckCircle, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import { TIME_SLOTS } from "../../data/booking";
import { fieldClass, labelClass } from "../../lib/ui";
import { useBlockSlot } from "../../hooks/useBlockSlot";

const DURATION_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hora", minutes: 60 },
  { label: "1 h 30 min", minutes: 90 },
  { label: "2 horas", minutes: 120 },
];

/** Formulario para que un barbero (o un admin, para un barbero
 * puntual) bloquee un horario de su agenda pensado para un cliente
 * presencial — para que ese horario deje de ofrecerse en la reserva
 * en línea. Ver api/staff/block-slot.ts para el porqué se modela como
 * una reserva especial en vez de una tabla nueva. */
export default function BlockSlotForm({
  barberId,
  date,
  onBlocked,
}: {
  /** El barbero específico a bloquear. null cuando un admin todavía no
   * eligió uno puntual (viendo "Todos"): el formulario se deshabilita. */
  barberId: string | null;
  date: string;
  onBlocked: () => void;
}) {
  const { blockSlot, blocking } = useBlockSlot();
  const [time, setTime] = useState(TIME_SLOTS.includes("10:00 am") ? "10:00 am" : TIME_SLOTS[0]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!barberId) return;
    setError(null);
    setSuccess(false);
    const result = await blockSlot({ barberId, date, time, durationMinutes, note: note.trim() || undefined });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setNote("");
    onBlocked();
  };

  return (
    <div className="card-lux">
      <p className="eyebrow justify-start before:hidden">Bloquear horario</p>
      <p className="mt-3 text-xs text-bone/50">
        Reserva un horario para un cliente presencial: deja de ofrecerse en la reserva en línea.
      </p>

      {!barberId ? (
        <p className="mt-4 text-sm text-bone/60">Elige un barbero específico arriba para poder bloquear.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Hora</label>
            <select value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass}>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Duración</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className={fieldClass}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.minutes} value={opt.minutes}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass}>Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Cliente de siempre"
              className={fieldClass}
            />
          </div>
        </div>
      )}

      {barberId && (
        <button
          type="button"
          disabled={blocking}
          onClick={() => void handleSubmit()}
          className="btn-outline mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {blocking ? <FaSpinner className="animate-spin" /> : <FaBan size={12} />}
          Bloquear horario
        </button>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> {error}
        </p>
      )}
      {success && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gold">
          <FaCheckCircle size={10} /> Horario bloqueado.
        </p>
      )}
    </div>
  );
}
