import { useCallback, useEffect, useState } from "react";
import { FaCheck, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import { fieldClass, labelClass } from "../../lib/ui";

interface BarberRow {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
}

function BarberRowItem({ barber, onSaved }: { barber: BarberRow; onSaved: (updated: BarberRow) => void }) {
  const [name, setName] = useState(barber.name);
  const [active, setActive] = useState(barber.active);
  const [sortOrder, setSortOrder] = useState(String(barber.sort_order));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { data, error: updateError } = await supabase
      .from("barbers")
      .update({ name: name.trim(), active, sort_order: Math.round(Number(sortOrder) || 0) })
      .eq("id", barber.id)
      .select("id, name, active, sort_order")
      .single();

    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? "No se pudo guardar.");
      return;
    }
    onSaved(data as BarberRow);
    setDirty(false);
  };

  return (
    <div className={`card-lux ${!active ? "opacity-60" : ""}`}>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <div>
          <label className={labelClass}>Nombre</label>
          <input value={name} onChange={(e) => markDirty(setName)(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Orden</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => markDirty(setSortOrder)(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest2 text-bone/70">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => markDirty(setActive)(e.target.checked)}
              className="accent-gold"
            />
            Activo (recibe reservas)
          </label>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void handleSave()}
            className="btn-gold w-full !py-3 text-xs disabled:opacity-40"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-bone/40">id: {barber.id}</p>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

export default function AdminBarbers() {
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("barbers")
      .select("id, name, active, sort_order")
      .order("sort_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setBarbers((data as BarberRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaved = (updated: BarberRow) => {
    setBarbers((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  return (
    <div>
      <p className="text-sm text-bone/60">
        Desactivar un barbero lo saca del selector de reservas y de la disponibilidad (útil para
        vacaciones o incapacidad) sin perder su historial. Agregar un barbero nuevo de verdad requiere
        también su propio calendario de Google (una variable de entorno) — no se puede crear solo desde
        aquí; pide que se configure primero.
      </p>

      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-bone/60">
            <FaSpinner className="animate-spin text-gold" /> Cargando barberos...
          </p>
        ) : error ? (
          <p className="text-sm text-blood">No se pudieron cargar los barberos: {error}</p>
        ) : (
          barbers.map((barber) => <BarberRowItem key={barber.id} barber={barber} onSaved={handleSaved} />)
        )}
      </div>
    </div>
  );
}
