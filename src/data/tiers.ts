/** Estilos por nivel de RED CLUB, reutilizando la paleta existente del
 * sitio (obsidian/gold/blood/bone) en vez de inventar colores nuevos.
 * Las claves coinciden con tiers.id (sembrado en 0004_seed.sql). */

export const TIER_CARD_CLASS: Record<string, string> = {
  black: "border-bone/25",
  red: "border-blood/40",
  gold: "border-gold/50",
  legend: "border-gold shadow-[0_0_40px_-10px_rgba(201,169,97,0.55)]",
};

export const TIER_TEXT_CLASS: Record<string, string> = {
  black: "text-ivory",
  red: "text-blood",
  gold: "text-gold",
  legend: "text-gold",
};

export const TIER_FALLBACK = "black";

/** Umbrales de visitas por nivel (espejo de supabase/migrations/0004_seed.sql
 * y de tier_for_visits en 0002_functions.sql). Solo se usan aquí para
 * calcular "cuántas visitas faltan para el siguiente nivel" en la
 * tarjeta digital — el nivel actual siempre viene de club_member_summary
 * (la base es la fuente de verdad), esto es puramente para la barra de
 * progreso. */
export const TIER_THRESHOLDS: { id: string; minVisits: number }[] = [
  { id: "black", minVisits: 0 },
  { id: "red", minVisits: 5 },
  { id: "gold", minVisits: 15 },
  { id: "legend", minVisits: 30 },
];

/** Visitas que faltan para el siguiente nivel, o null si ya está en el
 * más alto (LEGEND no tiene techo). */
export function visitsToNextTier(visitCount: number): number | null {
  const next = TIER_THRESHOLDS.find((t) => t.minVisits > visitCount);
  return next ? next.minVisits - visitCount : null;
}
