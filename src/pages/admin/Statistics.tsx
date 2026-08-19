import { useCallback, useEffect, useState } from "react";
import {
  FaChartLine,
  FaCoins,
  FaExclamationTriangle,
  FaSpinner,
  FaTrophy,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import { shiftDateStr, todayBogotaRange } from "../../lib/format";
import { ALL_BOOKABLE_SERVICES, calculateRedemptionCost, parsePriceToNumber } from "../../data/services";

/** Costo en puntos del servicio canjeable más económico — el umbral que
 * usa "Cerca de poder canjear" abajo. Se deriva del mismo catálogo que
 * ya usa la reserva (ver calculateRedemptionCost en services.ts), no de
 * un número fijo, para que un cambio de precios no lo desactualice. */
const MIN_REDEMPTION_COST = Math.min(
  ...ALL_BOOKABLE_SERVICES.map((s) => calculateRedemptionCost(parsePriceToNumber(s.price)))
);

interface MemberPointsRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  points_balance: number;
  tier_name: string | null;
}

interface Counts {
  total: number;
  newWeek: number;
  newMonth: number;
}

/** Estadísticas del club: registros y puntos. Deliberadamente separado
 * de /admin/clientes (que es para buscar y editar UNA persona) — esto
 * es para ver el estado general de un vistazo. Los conteos de registro
 * se filtran a role = 'client' (no cuentas de barbero/admin); el
 * leaderboard de puntos consulta club_member_summary tal cual, sin ese
 * filtro, porque en la práctica solo quien reserva como cliente
 * acumula puntos — agregar el filtro ahí exigiría traer todos los ids
 * de clientes aparte solo para cruzarlos, sin beneficio real hoy.
 */
export default function AdminStatistics() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [topPoints, setTopPoints] = useState<MemberPointsRow[]>([]);
  const [closeToRedeem, setCloseToRedeem] = useState<MemberPointsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { dateStr: today } = todayBogotaRange();
    const weekAgoISO = `${shiftDateStr(today, -7)}T00:00:00-05:00`;
    const monthStartISO = `${today.slice(0, 7)}-01T00:00:00-05:00`;

    const [totalRes, weekRes, monthRes, topRes, nearRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "client")
        .gte("created_at", weekAgoISO),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "client")
        .gte("created_at", monthStartISO),
      supabase
        .from("club_member_summary")
        .select("user_id, full_name, email, points_balance, tier_name")
        .order("points_balance", { ascending: false })
        .limit(10),
      supabase
        .from("club_member_summary")
        .select("user_id, full_name, email, points_balance, tier_name")
        .gt("points_balance", 0)
        .lt("points_balance", MIN_REDEMPTION_COST)
        .order("points_balance", { ascending: false })
        .limit(10),
    ]);

    const firstError =
      totalRes.error?.message ??
      weekRes.error?.message ??
      monthRes.error?.message ??
      topRes.error?.message ??
      nearRes.error?.message ??
      null;
    if (firstError) setError(firstError);

    setCounts({
      total: totalRes.count ?? 0,
      newWeek: weekRes.count ?? 0,
      newMonth: monthRes.count ?? 0,
    });
    setTopPoints((topRes.data as MemberPointsRow[]) ?? []);
    setCloseToRedeem((nearRes.data as MemberPointsRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-bone/60">
        <FaSpinner className="animate-spin text-gold" /> Cargando estadísticas...
      </p>
    );
  }

  const tiles = [
    { label: "Socios registrados", value: counts?.total ?? 0, icon: FaUsers },
    { label: "Nuevos esta semana", value: counts?.newWeek ?? 0, icon: FaUserPlus },
    { label: "Nuevos este mes", value: counts?.newMonth ?? 0, icon: FaChartLine },
  ];

  return (
    <div>
      {error && (
        <p className="mb-6 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> No se pudo cargar todo: {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="card-lux text-center">
            <tile.icon className="mx-auto text-xl text-gold" />
            <p className="mt-2 font-display text-4xl text-gold">{tile.value}</p>
            <p className="mt-2 text-xs uppercase tracking-widest2 text-bone/60">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow justify-start before:hidden">
            <FaTrophy className="mr-1.5 inline" size={11} /> Top puntos
          </p>
          <div className="mt-5 space-y-3">
            {topPoints.length === 0 ? (
              <p className="text-sm text-bone/60">Todavía no hay puntos otorgados.</p>
            ) : (
              topPoints.map((m, i) => (
                <div key={m.user_id} className="card-lux flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ivory">
                      <span className="mr-2 text-gold/60">#{i + 1}</span>
                      {m.full_name || m.email || "Sin nombre"}
                    </p>
                    {m.tier_name && <p className="mt-1 text-xs text-bone/50">{m.tier_name}</p>}
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-sm text-gold">
                    <FaCoins size={11} /> {m.points_balance}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="eyebrow justify-start before:hidden">Cerca de poder canjear</p>
          <p className="mt-3 text-xs text-bone/50">
            Les faltan menos de {MIN_REDEMPTION_COST} puntos (el costo del servicio canjeable más
            económico) para poder pagar su próxima cita con puntos.
          </p>
          <div className="mt-5 space-y-3">
            {closeToRedeem.length === 0 ? (
              <p className="text-sm text-bone/60">Nadie está cerca todavía.</p>
            ) : (
              closeToRedeem.map((m) => (
                <div key={m.user_id} className="card-lux flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm text-ivory">{m.full_name || m.email || "Sin nombre"}</p>
                  <span className="flex shrink-0 items-center gap-1.5 text-sm text-gold">
                    <FaCoins size={11} /> {m.points_balance} / {MIN_REDEMPTION_COST}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
