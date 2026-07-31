import { useCallback, useEffect, useState } from "react";
import { FaCheck, FaExclamationTriangle, FaPlus, FaSpinner } from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import { fieldClass, labelClass } from "../../lib/ui";
import { formatCop } from "../../lib/format";

interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  price_cop: number;
  duration_minutes: number;
  active: boolean;
  sort_order: number;
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ServiceRowItem({
  service,
  onSaved,
}: {
  service: ServiceRow;
  onSaved: (updated: ServiceRow) => void;
}) {
  const [name, setName] = useState(service.name);
  const [category, setCategory] = useState(service.category ?? "");
  const [price, setPrice] = useState(String(service.price_cop));
  const [duration, setDuration] = useState(String(service.duration_minutes));
  const [active, setActive] = useState(service.active);
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
      .from("services")
      .update({
        name: name.trim(),
        category: category.trim() || null,
        price_cop: Math.max(0, Math.round(Number(price) || 0)),
        duration_minutes: Math.max(1, Math.round(Number(duration) || 0)),
        active,
      })
      .eq("id", service.id)
      .select("id, name, category, price_cop, duration_minutes, active, sort_order")
      .single();

    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? "No se pudo guardar.");
      return;
    }
    onSaved(data as ServiceRow);
    setDirty(false);
  };

  return (
    <div className={`card-lux ${!active ? "opacity-60" : ""}`}>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <div>
          <label className={labelClass}>Nombre</label>
          <input value={name} onChange={(e) => markDirty(setName)(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Categoría</label>
          <input
            value={category}
            onChange={(e) => markDirty(setCategory)(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Precio (COP)</label>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => markDirty(setPrice)(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Duración (min)</label>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => markDirty(setDuration)(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col justify-between gap-2">
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest2 text-bone/70">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => markDirty(setActive)(e.target.checked)}
              className="accent-gold"
            />
            Activo
          </label>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void handleSave()}
            className="btn-gold !py-2 !px-4 text-xs disabled:opacity-40"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
          </button>
        </div>
      </div>
      {!dirty && <p className="mt-3 text-xs text-bone/40">{formatCop(service.price_cop)} · id: {service.id}</p>}
      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

function NewServiceForm({ onCreated }: { onCreated: (created: ServiceRow) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("30");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = slugify(name);

  const handleCreate = async () => {
    if (!supabase) return;
    if (!name.trim() || !id) {
      setError("El nombre es requerido.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("services")
      .insert({
        id,
        name: name.trim(),
        category: category.trim() || null,
        price_cop: Math.max(0, Math.round(Number(price) || 0)),
        duration_minutes: Math.max(1, Math.round(Number(duration) || 0)),
        active: true,
      })
      .select("id, name, category, price_cop, duration_minutes, active, sort_order")
      .single();

    setSaving(false);
    if (insertError || !data) {
      setError(
        insertError?.message.includes("duplicate")
          ? "Ya existe un servicio con un nombre muy parecido. Ajusta el nombre."
          : (insertError?.message ?? "No se pudo crear el servicio.")
      );
      return;
    }
    onCreated(data as ServiceRow);
    setName("");
    setCategory("");
    setPrice("");
    setDuration("30");
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline">
        <FaPlus size={11} className="mr-2 inline" /> Nuevo servicio
      </button>
    );
  }

  return (
    <div className="card-lux border-gold/30">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
          {id && <p className="mt-1 text-xs text-bone/40">id: {id}</p>}
        </div>
        <div>
          <label className={labelClass}>Categoría</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Precio (COP)</label>
          <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Duración (min)</label>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> {error}
        </p>
      )}
      <div className="mt-4 flex gap-3">
        <button type="button" disabled={saving} onClick={() => void handleCreate()} className="btn-gold !py-2 !px-5 text-xs disabled:opacity-50">
          {saving ? <FaSpinner className="animate-spin" /> : "Crear"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline !py-2 !px-5 text-xs">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function AdminServices() {
  const [services, setServices] = useState<ServiceRow[]>([]);
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
      .from("services")
      .select("id, name, category, price_cop, duration_minutes, active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setServices((data as ServiceRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaved = (updated: ServiceRow) => {
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };
  const handleCreated = (created: ServiceRow) => {
    setServices((prev) => [...prev, created]);
  };

  return (
    <div>
      <p className="text-sm text-bone/60">
        Los precios y duraciones de aquí son la fuente real: una reserva nueva usa estos valores. Un
        servicio no se elimina (puede tener historial de reservas) — desactívalo para que deje de
        ofrecerse.
      </p>

      <div className="mt-6">
        <NewServiceForm onCreated={handleCreated} />
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-bone/60">
            <FaSpinner className="animate-spin text-gold" /> Cargando servicios...
          </p>
        ) : error ? (
          <p className="text-sm text-blood">No se pudieron cargar los servicios: {error}</p>
        ) : (
          services.map((service) => (
            <ServiceRowItem key={service.id} service={service} onSaved={handleSaved} />
          ))
        )}
      </div>
    </div>
  );
}
