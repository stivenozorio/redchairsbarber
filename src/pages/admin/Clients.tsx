import { useCallback, useEffect, useState } from "react";
import { FaBirthdayCake, FaCheck, FaCoins, FaExclamationTriangle, FaPen, FaSpinner } from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../types/club";
import { fieldClass, labelClass } from "../../lib/ui";
import { formatBirthday, formatShortDate } from "../../lib/format";
import { TIER_FALLBACK, TIER_TEXT_CLASS } from "../../data/tiers";

const RESULT_LIMIT = 200;
const TODAY = new Date().toISOString().split("T")[0];

/** Profile + lo que ya calcula club_member_summary (puntos y nivel),
 * traído aparte en una segunda consulta liviana — mismo patrón que
 * useStaffBookings con booking_services, en vez de una relación
 * embebida atada al cache de esquema de PostgREST. */
interface ClientWithPoints extends Profile {
  points_balance: number | null;
  tier_id: string | null;
  tier_name: string | null;
}

function ClientRow({
  client,
  onSaved,
}: {
  client: ClientWithPoints;
  onSaved: (updated: Profile) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(client.full_name ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [birthday, setBirthday] = useState(client.birthday ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null, birthday: birthday || null })
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
          <div>
            <label className={labelClass}>Cumpleaños</label>
            <input
              type="date"
              max={TODAY}
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
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
          {client.birthday && (
            <span className="flex items-center gap-1.5 text-gold/70">
              <FaBirthdayCake size={10} /> {formatBirthday(client.birthday)}
            </span>
          )}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest2">
          <span
            className={`flex items-center gap-1.5 rounded-full border border-gold/20 px-3 py-1 ${
              TIER_TEXT_CLASS[client.tier_id ?? TIER_FALLBACK]
            }`}
          >
            {client.tier_name ?? "Sin nivel asignado"}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-gold/20 px-3 py-1 text-gold">
            <FaCoins size={10} /> {client.points_balance ?? 0} puntos
          </span>
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
  const [clients, setClients] = useState<ClientWithPoints[]>([]);
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
      setLoading(false);
      return;
    }

    const rows = (data as Profile[]) ?? [];
    if (rows.length === 0) {
      setClients([]);
      setLoading(false);
      return;
    }

    // Puntos y nivel: informativo, no bloqueante — si esta consulta falla,
    // se muestra la lista igual, solo sin el badge de puntos (mismo
    // principio que los servicios en useMyBookings/useStaffBookings).
    const { data: summaryRows, error: summaryError } = await supabase
      .from("club_member_summary")
      .select("user_id, points_balance, tier_id, tier_name")
      .in(
        "user_id",
        rows.map((r) => r.id)
      );
    if (summaryError) {
      console.error("No se pudo cargar puntos/nivel de los clientes:", summaryError.message);
    }

    const byId = new Map(
      ((summaryRows as unknown as {
        user_id: string;
        points_balance: number;
        tier_id: string | null;
        tier_name: string | null;
      }[]) ?? []).map((s) => [s.user_id, s])
    );

    setClients(
      rows.map((r) => ({
        ...r,
        points_balance: byId.get(r.id)?.points_balance ?? null,
        tier_id: byId.get(r.id)?.tier_id ?? null,
        tier_name: byId.get(r.id)?.tier_name ?? null,
      }))
    );
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaved = (updated: Profile) => {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
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
