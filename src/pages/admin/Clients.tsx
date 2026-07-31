import { useCallback, useEffect, useState } from "react";
import { FaCheck, FaExclamationTriangle, FaPen, FaSpinner } from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../types/club";
import { fieldClass, labelClass } from "../../lib/ui";
import { formatShortDate } from "../../lib/format";

const RESULT_LIMIT = 200;

function ClientRow({ client, onSaved }: { client: Profile; onSaved: (updated: Profile) => void }) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(client.full_name ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", client.id)
      .select("*")
      .single();

    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? "No se pudo guardar.");
      return;
    }
    onSaved(data as Profile);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="card-lux">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Nombre</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
          </div>
        </div>
        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-blood">
            <FaExclamationTriangle size={10} /> {error}
          </p>
        )}
        <div className="mt-4 flex gap-3">
          <button type="button" disabled={saving} onClick={() => void handleSave()} className="btn-gold !py-2 !px-5 text-xs disabled:opacity-50">
            {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />} Guardar
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-outline !py-2 !px-5 text-xs">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-lux flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-display text-lg text-ivory">{client.full_name || "Sin nombre"}</p>
        <p className="mt-1 text-sm text-bone/60">{client.email}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-widest2 text-bone/50">
          <span>{client.phone || "Sin teléfono"}</span>
          <span>{client.visit_count} visita{client.visit_count === 1 ? "" : "s"}</span>
          <span>Desde {formatShortDate(client.created_at)}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="btn-outline shrink-0 !py-2 !px-5 text-xs"
      >
        <FaPen size={11} className="mr-2 inline" /> Editar
      </button>
    </div>
  );
}

export default function AdminClients() {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    let query = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(RESULT_LIMIT);

    const term = search.trim();
    if (term) {
      const escaped = term.replace(/[%,]/g, "");
      query = query.or(
        `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`
      );
    }

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setClients([]);
    } else {
      setClients((data as Profile[]) ?? []);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaved = (updated: Profile) => {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  return (
    <div>
      <div className="max-w-md">
        <label className={labelClass}>Buscar cliente</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre, correo o teléfono"
          className={fieldClass}
        />
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-bone/60">
            <FaSpinner className="animate-spin text-gold" /> Cargando clientes...
          </p>
        ) : error ? (
          <p className="text-sm text-blood">No se pudieron cargar los clientes: {error}</p>
        ) : clients.length === 0 ? (
          <div className="card-lux">
            <p className="text-sm text-bone/70">No hay clientes que coincidan con esta búsqueda.</p>
          </div>
        ) : (
          clients.map((client) => <ClientRow key={client.id} client={client} onSaved={handleSaved} />)
        )}
      </div>
    </div>
  );
}
