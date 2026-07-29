import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMissingSupabaseEnvVars, getSupabaseAdmin } from "./_lib/supabaseAdmin.js";
import { getMissingEnvVars as getMissingCalendarEnvVars } from "./_lib/googleCalendar.js";

/**
 * Diagnóstico completo de RED CLUB, de solo lectura.
 *
 * Diseñado para responder UNA pregunta: si algo no funciona, ¿qué es
 * exactamente y qué hay que hacer? Nunca devuelve un `ok:false` sin
 * explicar el motivo ni los pasos a seguir.
 */

const EXPECTED_TABLES = [
  "profiles",
  "bookings",
  "booking_services",
  "services",
  "tiers",
  "barbers",
  "memberships",
  "referrals",
  "rewards",
  "reward_redemptions",
  "points_transactions",
] as const;

const EXPECTED_SEEDS = { tiers: 4, barbers: 2, services: 21 } as const;

const EXPECTED_FUNCTIONS = [
  "handle_new_user",
  "generate_referral_code",
  "is_staff",
  "is_admin",
  "tier_for_visits",
  "protect_profile_fields",
  "set_updated_at",
  "redclub_diagnostics",
];

const EXPECTED_VIEWS = ["member_points_balance", "club_member_summary"];

interface TableCheck {
  table: string;
  ok: boolean;
  rows: number | null;
  error: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const problems: string[] = [];
  const nextSteps: string[] = [];

  // ---------------------------------------------------------
  // 1. Variables de entorno
  // ---------------------------------------------------------
  const missingSupabaseEnv = getMissingSupabaseEnvVars();
  let missingCalendarEnv: string[] = [];
  try {
    missingCalendarEnv = getMissingCalendarEnvVars();
  } catch {
    missingCalendarEnv = ["(no se pudo verificar)"];
  }

  if (missingSupabaseEnv.length > 0) {
    problems.push(`Faltan variables de Supabase: ${missingSupabaseEnv.join(", ")}`);
    nextSteps.push(
      "Agrega esas variables en Vercel → Settings → Environment Variables (entorno Production) y vuelve a desplegar."
    );
    res.status(200).json({
      ok: false,
      problems,
      nextSteps,
      env: { supabase: { missing: missingSupabaseEnv }, calendar: { missing: missingCalendarEnv } },
      tables: [],
      seeds: null,
      database: null,
    });
    return;
  }

  if (missingCalendarEnv.length > 0) {
    problems.push(`Faltan variables de Google Calendar: ${missingCalendarEnv.join(", ")}`);
    nextSteps.push("Configura las variables de Google Calendar para que las reservas creen el evento.");
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(200).json({
      ok: false,
      problems: [...problems, "No se pudo crear el cliente de Supabase."],
      nextSteps,
      env: { supabase: { missing: [] }, calendar: { missing: missingCalendarEnv } },
      tables: [],
      seeds: null,
      database: null,
    });
    return;
  }

  // ---------------------------------------------------------
  // 2. Tablas: existencia y número de filas
  // ---------------------------------------------------------
  const tables: TableCheck[] = await Promise.all(
    EXPECTED_TABLES.map(async (table): Promise<TableCheck> => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        const hint = /does not exist/i.test(error.message)
          ? " (la tabla no existe: falta ejecutar las migraciones)"
          : "";
        return { table, ok: false, rows: null, error: `${error.message}${hint}` };
      }
      return { table, ok: true, rows: count ?? 0, error: null };
    })
  );

  const missingTables = tables.filter((t) => !t.ok);
  if (missingTables.length > 0) {
    problems.push(
      `Estas tablas no responden: ${missingTables.map((t) => t.table).join(", ")}`
    );
    nextSteps.push(
      "En Supabase → SQL Editor, ejecuta en orden: 0001_schema.sql, 0002_functions.sql, 0003_rls.sql, 0004_seed.sql, 0005_profile_and_diagnostics.sql"
    );
  }

  // ---------------------------------------------------------
  // 3. Semillas (catálogos). Esta es la causa más frecuente de
  //    que las reservas no se guarden: bookings.barber_id tiene una
  //    llave foránea contra barbers, así que con barbers vacío TODA
  //    inserción de reserva falla.
  // ---------------------------------------------------------
  const rowsOf = (name: string) => tables.find((t) => t.table === name)?.rows ?? 0;

  const seeds = {
    tiers: { found: rowsOf("tiers"), expected: EXPECTED_SEEDS.tiers },
    barbers: { found: rowsOf("barbers"), expected: EXPECTED_SEEDS.barbers },
    services: { found: rowsOf("services"), expected: EXPECTED_SEEDS.services },
  };
  const seedsOk =
    seeds.tiers.found >= seeds.tiers.expected &&
    seeds.barbers.found >= seeds.barbers.expected &&
    seeds.services.found >= seeds.services.expected;

  if (missingTables.length === 0 && !seedsOk) {
    const faltantes = Object.entries(seeds)
      .filter(([, v]) => v.found < v.expected)
      .map(([k, v]) => `${k} (${v.found} de ${v.expected})`)
      .join(", ");
    problems.push(
      `Los catálogos están incompletos: ${faltantes}. ` +
        "Con la tabla barbers vacía, NINGUNA reserva se puede guardar: " +
        "bookings.barber_id tiene una llave foránea contra barbers."
    );
    nextSteps.push("En Supabase → SQL Editor, ejecuta supabase/migrations/0004_seed.sql");
  }

  // ---------------------------------------------------------
  // 4. Estructura de la base (FKs, índices, triggers, vistas)
  // ---------------------------------------------------------
  let database: Record<string, unknown> | null = null;
  const { data: diag, error: diagError } = await supabase.rpc("redclub_diagnostics");

  if (diagError) {
    problems.push(`No se pudo leer el diagnóstico de la base: ${diagError.message}`);
    nextSteps.push(
      "Ejecuta supabase/migrations/0005_profile_and_diagnostics.sql en Supabase → SQL Editor"
    );
  } else if (diag) {
    const d = diag as Record<string, never>;
    const funciones: string[] = (d.funciones as unknown as string[]) ?? [];
    const vistas: string[] = (d.vistas as unknown as string[]) ?? [];
    const triggers: string[] = (d.triggers as unknown as string[]) ?? [];
    const fks = (d.foreign_keys as unknown as unknown[]) ?? [];
    const indices: string[] = (d.indices as unknown as string[]) ?? [];
    const rls = (d.rls_habilitado as unknown as Record<string, boolean>) ?? {};
    const huerfanos = Number(d.profiles_sin_perfil ?? 0);

    const funcionesFaltantes = EXPECTED_FUNCTIONS.filter((f) => !funciones.includes(f));
    const vistasFaltantes = EXPECTED_VIEWS.filter((v) => !vistas.includes(v));
    const triggerPerfil = triggers.includes("on_auth_user_created");
    const sinRls = Object.entries(rls)
      .filter(([, enabled]) => !enabled)
      .map(([table]) => table);

    if (funcionesFaltantes.length > 0) {
      problems.push(`Faltan funciones: ${funcionesFaltantes.join(", ")}`);
      nextSteps.push("Ejecuta 0002_functions.sql y 0005_profile_and_diagnostics.sql");
    }
    if (vistasFaltantes.length > 0) {
      problems.push(`Faltan vistas: ${vistasFaltantes.join(", ")}`);
      nextSteps.push("Ejecuta 0002_functions.sql");
    }
    if (!triggerPerfil) {
      problems.push(
        "Falta el trigger on_auth_user_created: los perfiles no se crearán al registrarse."
      );
      nextSteps.push("Ejecuta 0002_functions.sql");
    }
    if (sinRls.length > 0) {
      problems.push(`Tablas sin Row Level Security: ${sinRls.join(", ")}`);
      nextSteps.push("Ejecuta 0003_rls.sql");
    }
    if (huerfanos > 0) {
      problems.push(`Hay ${huerfanos} usuario(s) sin perfil en la tabla profiles.`);
      nextSteps.push(
        "Ejecuta 0005_profile_and_diagnostics.sql: repara los perfiles faltantes sin tocar los existentes."
      );
    }

    database = {
      conteos: d.counts,
      usuariosSinPerfil: huerfanos,
      llavesForaneas: { total: fks.length, detalle: fks },
      indices: { total: indices.length, nombres: indices },
      triggers,
      funciones: { presentes: funciones, faltantes: funcionesFaltantes },
      vistas: { presentes: vistas, faltantes: vistasFaltantes },
      rlsHabilitado: rls,
      politicasPorTabla: d.politicas,
    };
  }

  const ok = problems.length === 0;

  res.status(200).json({
    ok,
    resumen: ok
      ? "RED CLUB está configurado correctamente."
      : `Se encontraron ${problems.length} problema(s).`,
    problems,
    nextSteps: [...new Set(nextSteps)],
    env: {
      supabase: { missing: [] },
      calendar: { missing: missingCalendarEnv },
    },
    tables,
    seeds: { ...seeds, ok: seedsOk },
    database,
  });
}
