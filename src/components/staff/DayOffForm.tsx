import { useCallback, useEffect, useState } from "react";
import {
  FaCalendarTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaTrash,
} from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import { fieldClass, labelClass } from "../../lib/ui";
import { formatLongDate, todayBogotaRange } from "../../lib/format";
import { useDayOff } from "../../hooks/useDayOff";

interface DayOffRow {
  id: string;
  date: string;
  note: string | null;
}

/** Bloquear un día completo ("no voy a trabajar ese día") desde el
 * panel del barbero — a diferencia de BlockSlotForm (una sola hora,
 * para un cliente presencial), esto cierra toda la jornada. Ver
 * api/staff/day-off.ts para el porqué no toca Google Calendar. */
export default function DayOffForm({
  barberId,
  defaultDate,
}: {
  /** El barbero específico a bloquear. null cuando un admin todavía no
   * eligió uno puntual (viendo "Todos"): el formulario se deshabilita. */
  barberId: string | null;
  defaultDate: string;
}) {
  const { setDayOff, removeDayOff, saving } = useDayOff();
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [daysOff, setDaysOff] = useState<DayOffRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const today = todayBogotaRange().dateStr;

  const loadDaysOff = useCallback(async () => {
    if (!supabase || !barberId) {
      setDaysOff([]);
      return;
    }
    setLoadingList(true);
    const { data } = await supabase
      .from("schedule_exceptions")
      .select("id, date, note")
      .eq("barber_id", barberId)
      .eq("is_closed", true)
      .gte("date", today)
      .order("date", { ascending: true });
    setDaysOff((data as DayOffRow[]) ?? []);
    setLoadingList(false);
  }, [barberId, today]);

  useEffect(() => {
    void loadDaysOff();
  }, [loadDaysOff]);

  const handleSubmit = async () => {
    if (!barberId) return;
    if (
      !window.confirm(
        "¿Bloquear todo el día? Esto no cancela citas que ya tengas agendadas ese día — revísalas aparte si es necesario."
      )
    ) {
      return;
    }
    setError(null);
    setSuccess(false);
    const result = await setDayOff(barberId, date, note.trim() || undefined);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setNote("");
    void loadDaysOff();
  };

  const handleRemove = async (offDate: string) => {
    if (!barberId) return;
    setError(null);
    const result = await removeDayOff(barberId, offDate);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void loadDaysOff();
  };

  return (
    <div className="card-lux">
      <p className="eyebrow justify-start before:hidden">Bloquear un día completo</p>
      <p className="mt-3 text-xs text-bone/50">
        Para cuando no vayas a trabajar ese día: deja de ofrecerse en la reserva en línea.
      </p>

      {!barberId ? (
        <p className="mt-4 text-sm text-bone/60">Elige un barbero específico arriba para poder bloquear.</p>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Fecha</label>
              <input
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Motivo (opcional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej. Cita médica"
                className={fieldClass}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="btn-outline mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaCalendarTimes size={12} />}
            Bloquear este día
          </button>

          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-blood">
              <FaExclamationTriangle size={10} /> {error}
            </p>
          )}
          {success && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-gold">
              <FaCheckCircle size={10} /> Día bloqueado.
            </p>
          )}

          {loadingList ? (
            <p className="mt-5 flex items-center gap-2 text-xs text-bone/50">
              <FaSpinner className="animate-spin" /> Cargando días bloqueados...
            </p>
          ) : daysOff.length > 0 ? (
            <div className="mt-5 space-y-2 border-t border-gold/10 pt-4">
              <p className="text-[10px] uppercase tracking-widest2 text-bone/40">
                Próximos días bloqueados
              </p>
              {daysOff.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 text-sm text-bone/70">
                  <span className="capitalize">
                    {formatLongDate(`${d.date}T00:00:00-05:00`)}
                    {d.note ? ` — ${d.note}` : ""}
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleRemove(d.date)}
                    className="shrink-0 text-blood/70 transition-colors hover:text-blood disabled:opacity-50"
                    aria-label="Quitar bloqueo"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
