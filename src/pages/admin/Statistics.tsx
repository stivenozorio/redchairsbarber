import { useCallback, useEffect, useState } from "react";
import {
  FaChartLine,
  FaCoins,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaSpinner,
  FaTrophy,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import { formatCop, shiftDateStr, todayBogotaRange } from "../../lib/format";
import {
  ALL_BOOKABLE_SERVICES,
  calculateRedemptionCost,
  COP_PER_REDEMPTION_POINT,
  parsePriceToNumber,
} from "../../data/services";

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

interface RevenuePeriod {
  /** Suma de total_price_cop de citas completadas pagadas en efectivo
   * (no canjeadas con puntos) — plata que de verdad entró a caja. */
  cash: number;
  /** Suma de total_price_cop de citas completadas pagadas con puntos —
   * el valor del servicio entregado, aparte del efectivo: no es plata
   * que haya entrado a caja ese día, ya se "cobró" antes en puntos. */
  redeemedValue: number;
}

interface Revenue {
  week: RevenuePeriod;
  month: RevenuePeriod;
  total: RevenuePeriod;
}

interface PointsValue {
  /** Suma de TODOS los movimientos (positivos y negativos) — el saldo
   * total pendiente de todos los socios, en puntos y en pesos: lo que
   * costaría si todos canjearan hoy mismo. */
  pendingPoints: number;
  /** Suma de los canjes ya hechos (reason = 'reward_redemption',
   * montos negativos) — plata que ya se le "devolvió" al cliente. */
  redeemedPoints: number;
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
  const [pointsValue, setPointsValue] = useState<PointsValue | null>(null);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
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

    const [totalRes, weekRes, monthRes, topRes, nearRes, ledgerRes, completedRes] = await Promise.all([
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
      // Todo el libro mayor de puntos, para sumar el saldo pendiente y lo
      // ya canjeado — no hay (todavía) tantos movimientos como para que
      // esto no quepa en una sola consulta; si el club crece mucho, este
      // cálculo debería moverse a una vista/función en la base.
      supabase.from("points_transactions").select("amount, reason").limit(50000),
      // Todas las citas completadas, para sumar lo recaudado — mismo
      // criterio que el libro de puntos arriba: a este tamaño no hace
      // falta un agregado en la base, solo sumar en el navegador.
      supabase
        .from("bookings")
        .select("total_price_cop, redeemed_with_points, completed_at")
        .eq("status", "completed")
        .limit(50000),
    ]);

    const firstError =
      totalRes.error?.message ??
      weekRes.error?.message ??
      monthRes.error?.message ??
      topRes.error?.message ??
      nearRes.error?.message ??
      ledgerRes.error?.message ??
      completedRes.error?.message ??
      null;
    if (firstError) setError(firstError);

    setCounts({
      total: totalRes.count ?? 0,
      newWeek: weekRes.count ?? 0,
      newMonth: monthRes.count ?? 0,
    });
    setTopPoints((topRes.data as MemberPointsRow[]) ?? []);
    setCloseToRedeem((nearRes.data as MemberPointsRow[]) ?? []);

    const ledger = (ledgerRes.data as { amount: number; reason: string }[]) ?? [];
    setPointsValue({
      pendingPoints: ledger.reduce((sum, row) => sum + row.amount, 0),
      redeemedPoints: ledger
        .filter((row) => row.reason === "reward_redemption")
        .reduce((sum, row) => sum - row.amount, 0),
    });

    const completedBookings =
      (completedRes.data as {
        total_price_cop: number;
        redeemed_with_points: boolean;
        completed_at: string | null;
      }[]) ?? [];
    const sumPeriod = (sinceISO: string | null): RevenuePeriod =>
      completedBookings
        .filter((b) => b.completed_at && (!sinceISO || b.completed_at >= sinceISO))
        .reduce(
          (acc, b) =>
            b.redeemed_with_points
              ? { ...acc, redeemedValue: acc.redeemedValue + b.total_price_cop }
              : { ...acc, cash: acc.cash + b.total_price_cop },
          { cash: 0, redeemedValue: 0 }
        );
    setRevenue({
      week: sumPeriod(weekAgoISO),
      month: sumPeriod(monthStartISO),
      total: sumPeriod(null),
    });
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

      <div className="mt-12">
        <p className="eyebrow justify-start before:hidden">Ingresos por citas completadas</p>
        <p className="mt-3 text-xs text-bone/50">
          Solo cuenta reservas en estado "Completada", según cuándo se completaron (no cuándo se
          agendaron). Lo pagado con puntos RED CLUB se muestra aparte: no es plata que haya entrado
          a caja ese día, ya se "cobró" antes en puntos.
        </p>
        <div className="mt-5 space-y-3">
          {(
            [
              { label: "Esta semana", data: revenue?.week },
              { label: "Este mes", data: revenue?.month },
              { label: "Total histórico", data: revenue?.total },
            ] as { label: string; data: RevenuePeriod | undefined }[]
          ).map((period) => (
            <div
              key={period.label}
              className="card-lux flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm uppercase tracking-widest2 text-bone/60">{period.label}</p>
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="flex items-center gap-2 font-display text-2xl text-gold">
                    <FaMoneyBillWave size={16} /> {formatCop(period.data?.cash ?? 0)}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest2 text-bone/50">Efectivo</p>
                </div>
                <div>
                  <p className="flex items-center gap-2 font-display text-2xl text-gold/70">
                    <FaExchangeAlt size={14} /> {formatCop(period.data?.redeemedValue ?? 0)}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest2 text-bone/50">
                    Pagado con puntos
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <p className="eyebrow justify-start before:hidden">Valor en pesos de los puntos</p>
        <p className="mt-3 text-xs text-bone/50">
          A la tasa de canje de 1 punto = {formatCop(COP_PER_REDEMPTION_POINT)} COP.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="card-lux text-center">
            <p className="font-display text-3xl text-gold">
              {formatCop((pointsValue?.redeemedPoints ?? 0) * COP_PER_REDEMPTION_POINT)}
            </p>
            <p className="mt-2 text-xs uppercase tracking-widest2 text-bone/60">
              Ya canjeado ({pointsValue?.redeemedPoints ?? 0} pts)
            </p>
          </div>
          <div className="card-lux text-center">
            <p className="font-display text-3xl text-gold">
              {formatCop((pointsValue?.pendingPoints ?? 0) * COP_PER_REDEMPTION_POINT)}
            </p>
            <p className="mt-2 text-xs uppercase tracking-widest2 text-bone/60">
              Pendiente por canjear ({pointsValue?.pendingPoints ?? 0} pts en saldo)
            </p>
          </div>
        </div>
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
