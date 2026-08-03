import { FaCrown, FaSpinner } from "react-icons/fa";
import { useMemberSummary } from "../../hooks/useMemberSummary";
import { TIER_CARD_CLASS, TIER_FALLBACK, TIER_TEXT_CLASS, visitsToNextTier } from "../../data/tiers";

/** Tarjeta digital del socio: nombre, nivel, puntos y progreso al
 * siguiente nivel. Sin código QR (fuera de alcance de esta fase).
 * Si no hay resumen disponible (Supabase no configurado, error, o el
 * socio aún no tiene fila en club_member_summary) no se renderiza nada,
 * siguiendo el mismo patrón de degradación elegante del resto del sitio. */
export default function DigitalCard({ userId }: { userId: string | undefined }) {
  const { summary, loading, error } = useMemberSummary(userId);

  if (loading && !summary) {
    return (
      <div className="card-lux">
        <p className="flex items-center gap-2 text-sm text-bone/60">
          <FaSpinner className="animate-spin text-gold" /> Cargando tu tarjeta...
        </p>
      </div>
    );
  }

  if (error || !summary) {
    return null;
  }

  const tierId = summary.tier_id ?? TIER_FALLBACK;
  const cardClass = TIER_CARD_CLASS[tierId] ?? TIER_CARD_CLASS[TIER_FALLBACK];
  const textClass = TIER_TEXT_CLASS[tierId] ?? TIER_TEXT_CLASS[TIER_FALLBACK];
  const remaining = visitsToNextTier(summary.visit_count);

  return (
    <div className={`card-lux ${cardClass}`}>
      <p className="eyebrow justify-start before:hidden">Tarjeta Red Club</p>

      <div className="mt-5 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl leading-tight text-ivory">
          {summary.full_name ?? "Socio Red Club"}
        </h2>
        <FaCrown className={`shrink-0 ${textClass}`} size={22} />
      </div>

      <p className={`mt-1 text-xs uppercase tracking-widest2 ${textClass}`}>
        {summary.tier_name ?? "Sin nivel"}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gold/10 pt-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest2 text-bone/40">Puntos</p>
          <p className="mt-1 font-display text-2xl text-gold">{summary.points_balance}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest2 text-bone/40">Visitas</p>
          <p className="mt-1 font-display text-2xl text-ivory">{summary.visit_count}</p>
        </div>
      </div>

      <p className="mt-6 text-xs text-bone/60">
        {remaining !== null
          ? `Te falta${remaining === 1 ? "" : "n"} ${remaining} visita${remaining === 1 ? "" : "s"} para el siguiente nivel.`
          : "Ya alcanzaste el nivel más alto."}
      </p>
    </div>
  );
}
