import { useCallback, useEffect, useState } from "react";
import { FaCheck, FaExclamationTriangle, FaSpinner, FaTrash } from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import { BARBERS } from "../../data/booking";
import { fieldClass, labelClass } from "../../lib/ui";
import { formatShortDate } from "../../lib/format";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const REAL_BARBERS = BARBERS.filter((b) => b.id !== "any");

interface ScheduleRow {
  barber_id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
}

interface ExceptionRow {
  id: string;
  barber_id: string | null;
  date: string;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  note: string | null;
}

function toTimeInput(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

function BarberScheduleEditor({
  barberId,
  barberName,
  rows,
  onSaved,
}: {
  barberId: string;
  barberName: string;
  rows: ScheduleRow[];
  onSaved: (rows: ScheduleRow[]) => void;
}) {
  const [days, setDays] = useState(() =>
    [0, 1, 2, 3, 4, 5, 6].map((d) => {
      const existing = rows.find((r) => r.day_of_week === d);
      return {
        day_of_week: d,
        is_open: existing?.is_open ?? false,
        open_time: toTimeInput(existing?.open_time ?? null) || "10:00",
        close_time: toTimeInput(existing?.close_time ?? null) || "20:00",
      };
    })
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDay = (day: number, patch: Partial<(typeof days)[number]>) => {
    setDays((prev) => prev.map((d) => (d.day_of_week === day ? { ...d, ...patch } : d)));
  };

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const payload = days.map((d) => ({
      barber_id: barberId,
      day_of_week: d.day_of_week,
      is_open: d.is_open,
      open_time: d.is_open ? d.open_time : null,
      close_time: d.is_open ? d.close_time : null,
    }));
    const { data, error: upsertError } = await supabase
      .from("barber_schedules")
      .upsert(payload, { onConflict: "barber_id,day_of_week" })
      .select("barber_id, day_of_week, is_open, open_time, close_time");

    setSaving(false);
    if (upsertError || !data) {
      setError(upsertError?.message ?? "No se pudo guardar el horario.");
      return;
    }
    onSaved(data as ScheduleRow[]);
  };

  return (
    <div className="card-lux">
      <p className="font-display text-lg text-ivory">{barberName}</p>
      <div className="mt-5 space-y-3">
        {days.map((d) => (
          <div key={d.day_of_week} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 sm:grid-cols-[140px_auto_1fr_1fr]">
            <span className="text-sm text-bone/70">{DAY_NAMES[d.day_of_week]}</span>
            <label className="flex items-center gap-2 text-xs uppercase tracking-widest2 text-bone/60">
              <input
                type="checkbox"
                checked={d.is_open}
                onChange={(e) => updateDay(d.day_of_week, { is_open: e.target.checked })}
                className="accent-gold"
              />
              Abierto
            </label>
            <input
              type="time"
              disabled={!d.is_open}
              value={d.open_time}
              onChange={(e) => updateDay(d.day_of_week, { open_time: e.target.value })}
              className={`${fieldClass} !py-2 disabled:opacity-30`}
            />
            <input
              type="time"
              disabled={!d.is_open}
              value={d.close_time}
              onChange={(e) => updateDay(d.day_of_week, { close_time: e.target.value })}
              className={`${fieldClass} !py-2 disabled:opacity-30`}
            />
          </div>
        ))}
      </div>
      {error && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> {error}
        </p>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className="btn-gold mt-5 !py-2 !px-5 text-xs disabled:opacity-50"
      >
        {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />} Guardar horario
      </button>
    </div>
  );
}

function ExceptionForm({ onCreated }: { onCreated: (row: ExceptionRow) => void }) {
  const [date, setDate] = useState("");
  const [barberId, setBarberId] = useState("todos");
  const [closed, setClosed] = useState(true);
  const [openTime, setOpenTime] = useState("10:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!supabase) return;
    if (!date) {
      setError("Elige una fecha.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("schedule_exceptions")
      .insert({
        barber_id: barberId === "todos" ? null : barberId,
        date,
        is_closed: closed,
        open_time: closed ? null : openTime,
        close_time: closed ? null : closeTime,
        note: note.trim() || null,
      })
      .select("id, barber_id, date, is_closed, open_time, close_time, note")
      .single();

    setSaving(false);
    if (insertError || !data) {
      setError(
        insertError?.message.includes("duplicate")
          ? "Ya existe una excepción para esa fecha y ese barbero."
          : (insertError?.message ?? "No se pudo crear la excepción.")
      );
      return;
    }
    onCreated(data as ExceptionRow);
    setDate("");
    setNote("");
  };

  return (
    <div className="card-lux border-gold/30">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Fecha</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Barbero</label>
          <select value={barberId} onChange={(e) => setBarberId(e.target.value)} className={fieldClass}>
            <option value="todos">Toda la barbería</option>
            {REAL_BARBERS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest2 text-bone/70">
            <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} className="accent-gold" />
            Cerrado ese día
          </label>
        </div>
        {!closed && (
          <>
            <div>
              <label className={labelClass}>Abre</label>
              <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Cierra</label>
              <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className={fieldClass} />
            </div>
          </>
        )}
        <div className="sm:col-span-2 lg:col-span-4">
          <label className={labelClass}>Nota (opcional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej. Festivo, capacitación del equipo…"
            className={fieldClass}
          />
        </div>
      </div>
      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> {error}
        </p>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleCreate()}
        className="btn-gold mt-4 !py-2 !px-5 text-xs disabled:opacity-50"
      >
        {saving ? <FaSpinner className="animate-spin" /> : "Agregar excepción"}
      </button>
    </div>
  );
}

export default function AdminSchedules() {
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [schedulesRes, exceptionsRes] = await Promise.all([
      supabase.from("barber_schedules").select("barber_id, day_of_week, is_open, open_time, close_time"),
      supabase
        .from("schedule_exceptions")
        .select("id, barber_id, date, is_closed, open_time, close_time, note")
        .order("date", { ascending: false })
        .limit(100),
    ]);

    if (schedulesRes.error) {
      setError(schedulesRes.error.message);
    } else {
      setScheduleRows((schedulesRes.data as ScheduleRow[]) ?? []);
    }
    setExceptions((exceptionsRes.data as ExceptionRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleBarberSaved = (updated: ScheduleRow[]) => {
    setScheduleRows((prev) => {
      const next = prev.filter(
        (r) => !updated.some((u) => u.barber_id === r.barber_id && u.day_of_week === r.day_of_week)
      );
      return [...next, ...updated];
    });
  };

  const handleExceptionDelete = async (id: string) => {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("schedule_exceptions").delete().eq("id", id);
    if (!deleteError) {
      setExceptions((prev) => prev.filter((e) => e.id !== id));
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-bone/60">
        <FaSpinner className="animate-spin text-gold" /> Cargando horarios...
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-blood">No se pudo cargar el horario: {error}</p>;
  }

  return (
    <div>
      <p className="eyebrow justify-start before:hidden">Horario semanal</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {REAL_BARBERS.map((b) => (
          <BarberScheduleEditor
            key={b.id}
            barberId={b.id}
            barberName={b.name}
            rows={scheduleRows.filter((r) => r.barber_id === b.id)}
            onSaved={handleBarberSaved}
          />
        ))}
      </div>

      <div className="mt-14">
        <p className="eyebrow justify-start before:hidden">Excepciones (festivos, horario especial)</p>
        <div className="mt-6">
          <ExceptionForm onCreated={(row) => setExceptions((prev) => [row, ...prev])} />
        </div>

        <div className="mt-6 space-y-3">
          {exceptions.length === 0 ? (
            <p className="text-sm text-bone/60">No hay excepciones registradas.</p>
          ) : (
            exceptions.map((exception) => (
              <div key={exception.id} className="card-lux flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-ivory">
                    {formatShortDate(`${exception.date}T00:00:00-05:00`)} ·{" "}
                    {exception.barber_id
                      ? (REAL_BARBERS.find((b) => b.id === exception.barber_id)?.name ?? exception.barber_id)
                      : "Toda la barbería"}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-widest2 text-bone/50">
                    {exception.is_closed
                      ? "Cerrado"
                      : `${toTimeInput(exception.open_time)} – ${toTimeInput(exception.close_time)}`}
                    {exception.note ? ` · ${exception.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleExceptionDelete(exception.id)}
                  aria-label="Eliminar excepción"
                  className="shrink-0 text-bone/50 transition-colors hover:text-blood"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
