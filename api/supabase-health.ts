import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMissingSupabaseEnvVars, getSupabaseAdmin } from "./_lib/supabaseAdmin.js";

const EXPECTED_TABLES = [
  "profiles",
  "barbers",
  "services",
  "tiers",
  "bookings",
  "booking_services",
  "points_transactions",
  "rewards",
  "reward_redemptions",
  "referrals",
  "memberships",
] as const;

/** Diagnóstico de solo lectura de RED CLUB.
 *
 * Reporta qué variables faltan (nunca sus valores) y si cada tabla del
 * modelo existe y responde. No escribe absolutamente nada. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const missingEnvVars = getMissingSupabaseEnvVars();
  if (missingEnvVars.length > 0) {
    res.status(200).json({ ok: false, missingEnvVars, tables: [], seeds: null });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(200).json({
      ok: false,
      missingEnvVars,
      tables: [],
      seeds: null,
      error: "No se pudo crear el cliente de Supabase.",
    });
    return;
  }

  const tables = await Promise.all(
    EXPECTED_TABLES.map(async (table) => {
      const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
      return { table, ok: !error, error: error?.message ?? null };
    })
  );

  // Verificar que las semillas se hayan ejecutado (niveles y barberos).
  let seeds: { tiers: number; barbers: number; services: number } | null = null;
  try {
    const [tiersRes, barbersRes, servicesRes] = await Promise.all([
      supabase.from("tiers").select("*", { count: "exact", head: true }),
      supabase.from("barbers").select("*", { count: "exact", head: true }),
      supabase.from("services").select("*", { count: "exact", head: true }),
    ]);
    seeds = {
      tiers: tiersRes.count ?? 0,
      barbers: barbersRes.count ?? 0,
      services: servicesRes.count ?? 0,
    };
  } catch {
    seeds = null;
  }

  const allTablesOk = tables.every((t) => t.ok);
  const seedsOk = Boolean(seeds && seeds.tiers === 4 && seeds.barbers >= 2 && seeds.services > 0);

  res.status(200).json({
    ok: allTablesOk && seedsOk,
    missingEnvVars: [],
    tables,
    seeds,
    seedsOk,
  });
}
