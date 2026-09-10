import { useCallback, useEffect, useState } from "react";
import {
  FaCalendarCheck,
  FaCheck,
  FaExclamationTriangle,
  FaIdBadge,
  FaLink,
  FaSpinner,
  FaUnlink,
} from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import { fieldClass, labelClass } from "../../lib/ui";
import BarberProfileModal from "../../components/admin/BarberProfileModal";

interface BarberRow {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
  user_id: string | null;
}

interface LinkedProfile {
  email: string;
  full_name: string | null;
}

/** Reservas que todavía requieren atención — ni completadas ni
 * canceladas ni "no asistió". Es lo que hay que reasignar o avisarle
 * al cliente cuando un barbero se va, sin importar si la fecha ya
 * quedó en el pasado (una pendiente vencida sigue necesitando que
 * alguien la resuelva). */
const ACTIVE_STATUSES = new Set(["pending", "confirmed", "in_progress"]);

function BarberRowItem({
  barber,
  activeBookings,
  linkedProfile,
  onSaved,
  onViewProfile,
  onLinked,
}: {
  barber: BarberRow;
  activeBookings: number;
  linkedProfile: LinkedProfile | null;
  onSaved: (updated: BarberRow) => void;
  onViewProfile: () => void;
  onLinked: (barberId: string, userId: string | null, profile: LinkedProfile | null) => void;
}) {
  const [name, setName] = useState(barber.name);
  const [active, setActive] = useState(barber.active);
  const [sortOrder, setSortOrder] = useState(String(barber.sort_order));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

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
      .select("id, name, active, sort_order, user_id")
      .single();

    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message ?? "No se pudo guardar.");
      return;
    }
    onSaved(data as BarberRow);
    setDirty(false);
  };

  const handleLink = async () => {
    if (!supabase) return;
    const email = linkEmail.trim();
    if (!email) return;
    setLinking(true);
    setLinkError(null);

    const { data: match, error: lookupError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .ilike("email", email)
      .maybeSingle();

    if (lookupError || !match) {
      setLinking(false);
      setLinkError("No existe ninguna cuenta registrada con ese correo. La persona debe crear su cuenta primero.");
      return;
    }
    if (match.role === "admin") {
      setLinking(false);
      setLinkError(
        "Esa cuenta ya es administrador — cambiarla a barbero le quitaría el acceso de admin. Si de verdad quieres esto, hazlo a mano por SQL."
      );
      return;
    }
    if (
      !window.confirm(
        `¿Vincular a ${match.full_name || match.email} como ${barber.name}? Va a poder entrar a /barbero y ver solo sus propias citas.`
      )
    ) {
      setLinking(false);
      return;
    }

    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: "barber" })
      .eq("id", match.id);
    if (roleError) {
      setLinking(false);
      setLinkError(roleError.message);
      return;
    }

    const { error: linkErr } = await supabase.from("barbers").update({ user_id: match.id }).eq("id", barber.id);
    setLinking(false);
    if (linkErr) {
      setLinkError(
        linkErr.message.includes("duplicate")
          ? "Esa cuenta ya está vinculada a otro barbero."
          : linkErr.message
      );
      return;
    }
    onLinked(barber.id, match.id, { email: match.email, full_name: match.full_name });
    setLinkEmail("");
  };

  const handleUnlink = async () => {
    if (!supabase) return;
    if (
      !window.confirm(
        `¿Desvincular a ${linkedProfile?.full_name || linkedProfile?.email} de ${barber.name}? Ya no va a poder entrar a /barbero como este barbero (su cuenta sigue existiendo, con rol de barbero, solo que sin vincular a ninguno).`
      )
    ) {
      return;
    }
    setLinking(true);
    setLinkError(null);
    const { error: unlinkErr } = await supabase.from("barbers").update({ user_id: null }).eq("id", barber.id);
    setLinking(false);
    if (unlinkErr) {
      setLinkError(unlinkErr.message);
      return;
    }
    onLinked(barber.id, null, null);
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
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-xs text-bone/40">id: {barber.id}</p>
          {activeBookings > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-gold/30 px-2.5 py-0.5 text-xs text-gold">
              <FaCalendarCheck size={10} /> {activeBookings} reserva{activeBookings === 1 ? "" : "s"} activa
              {activeBookings === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onViewProfile}
          className="flex shrink-0 items-center gap-1.5 text-xs uppercase tracking-widest2 text-gold/80 transition-colors hover:text-gold"
        >
          <FaIdBadge size={11} /> Ver perfil
        </button>
      </div>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> {error}
        </p>
      )}

      <div className="mt-4 border-t border-gold/10 pt-4">
        <label className={labelClass}>Cuenta de barbero (acceso a /barbero)</label>
        {linkedProfile ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-bone/70">
              Vinculada a <span className="text-ivory">{linkedProfile.full_name || linkedProfile.email}</span>{" "}
              <span className="text-bone/40">({linkedProfile.email})</span>
            </p>
            <button
              type="button"
              disabled={linking}
              onClick={() => void handleUnlink()}
              className="flex shrink-0 items-center gap-1.5 text-xs uppercase tracking-widest2 text-blood/70 transition-colors hover:text-blood disabled:opacity-50"
            >
              {linking ? <FaSpinner className="animate-spin" size={11} /> : <FaUnlink size={11} />} Desvincular
            </button>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={linkEmail}
              onChange={(e) => {
                setLinkEmail(e.target.value);
                setLinkError(null);
              }}
              placeholder="correo de la cuenta ya registrada"
              className={`${fieldClass} flex-1`}
            />
            <button
              type="button"
              disabled={linking || !linkEmail.trim()}
              onClick={() => void handleLink()}
              className="btn-outline shrink-0 !py-3 text-xs disabled:opacity-40"
            >
              {linking ? <FaSpinner className="animate-spin" /> : <FaLink size={11} />}
              <span className="ml-2">Vincular</span>
            </button>
          </div>
        )}
        {linkError && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-blood">
            <FaExclamationTriangle size={10} /> {linkError}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminBarbers() {
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingBarber, setViewingBarber] = useState<BarberRow | null>(null);
  // Por defecto oculta los inactivos (ej. un barbero que ya no trabaja
  // ahí) para no verlos estorbando en esta pantalla — pero sigue
  // habiendo una forma de encontrarlos sin tocar SQL, por si hace
  // falta reactivar a alguien más adelante.
  const [showInactive, setShowInactive] = useState(false);
  // Cuántas reservas sin resolver tiene cada barbero — para planear la
  // transición cuando uno se va y entra otro (a quién hay que
  // reasignar o avisarle antes de desactivarlo).
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});
  // Cuenta vinculada de cada barbero (barbers.user_id), para mostrar
  // quién es y poder vincular/desvincular sin tocar SQL — indexado por
  // profiles.id, no por barbero, porque se trae con una sola consulta
  // aparte (mismo patrón de dos consultas que el resto del panel).
  const [linkedProfiles, setLinkedProfiles] = useState<Record<string, LinkedProfile>>({});

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [barbersRes, activeBookingsRes] = await Promise.all([
      supabase
        .from("barbers")
        .select("id, name, active, sort_order, user_id")
        .order("sort_order", { ascending: true }),
      supabase
        .from("bookings")
        .select("barber_id")
        .neq("source", "blocked")
        .in("status", [...ACTIVE_STATUSES]),
    ]);

    const barberRows = (barbersRes.data as BarberRow[]) ?? [];
    if (barbersRes.error) {
      setError(barbersRes.error.message);
    } else {
      setBarbers(barberRows);
    }

    const counts: Record<string, number> = {};
    for (const row of (activeBookingsRes.data as { barber_id: string }[]) ?? []) {
      counts[row.barber_id] = (counts[row.barber_id] ?? 0) + 1;
    }
    setActiveCounts(counts);

    const linkedIds = barberRows.map((b) => b.user_id).filter((id): id is string => Boolean(id));
    if (linkedIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", linkedIds);
      const map: Record<string, LinkedProfile> = {};
      for (const row of (profileRows as { id: string; email: string; full_name: string | null }[]) ?? []) {
        map[row.id] = { email: row.email, full_name: row.full_name };
      }
      setLinkedProfiles(map);
    } else {
      setLinkedProfiles({});
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaved = (updated: BarberRow) => {
    setBarbers((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleLinked = (barberId: string, userId: string | null, profile: LinkedProfile | null) => {
    setBarbers((prev) => prev.map((b) => (b.id === barberId ? { ...b, user_id: userId } : b)));
    if (userId && profile) {
      setLinkedProfiles((prev) => ({ ...prev, [userId]: profile }));
    }
  };

  const visibleBarbers = showInactive ? barbers : barbers.filter((b) => b.active);
  const inactiveCount = barbers.length - barbers.filter((b) => b.active).length;

  return (
    <div>
      <p className="text-sm text-bone/60">
        Desactivar un barbero lo saca del selector de reservas y de la disponibilidad (útil para
        vacaciones, incapacidad, o alguien que ya no trabaja ahí) sin perder su historial. Agregar un
        barbero nuevo de verdad requiere también su propio calendario de Google (una variable de
        entorno) — no se puede crear solo desde aquí; pide que se configure primero.
      </p>

      {inactiveCount > 0 && (
        <label className="mt-4 flex w-fit items-center gap-2 text-xs uppercase tracking-widest2 text-bone/60">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-gold"
          />
          Mostrar inactivos ({inactiveCount})
        </label>
      )}

      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-bone/60">
            <FaSpinner className="animate-spin text-gold" /> Cargando barberos...
          </p>
        ) : error ? (
          <p className="text-sm text-blood">No se pudieron cargar los barberos: {error}</p>
        ) : visibleBarbers.length === 0 ? (
          <div className="card-lux">
            <p className="text-sm text-bone/70">No hay barberos activos en este momento.</p>
          </div>
        ) : (
          visibleBarbers.map((barber) => (
            <BarberRowItem
              key={barber.id}
              barber={barber}
              activeBookings={activeCounts[barber.id] ?? 0}
              linkedProfile={barber.user_id ? (linkedProfiles[barber.user_id] ?? null) : null}
              onSaved={handleSaved}
              onViewProfile={() => setViewingBarber(barber)}
              onLinked={handleLinked}
            />
          ))
        )}
      </div>

      {viewingBarber && (
        <BarberProfileModal
          barberId={viewingBarber.id}
          barberName={viewingBarber.name}
          onClose={() => setViewingBarber(null)}
        />
      )}
    </div>
  );
}
