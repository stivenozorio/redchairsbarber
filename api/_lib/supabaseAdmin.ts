import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para las funciones serverless.
 *
 * Usa la SERVICE ROLE KEY, que se salta Row Level Security. NUNCA debe
 * salir del servidor: no lleva prefijo VITE_ precisamente para que
 * Vite no pueda incluirla en el bundle del navegador.
 *
 * Devuelve `null` si no está configurado. Es intencional: las reservas
 * deben seguir funcionando contra Google Calendar aunque RED CLUB
 * todavía no esté conectado. Supabase se comporta como una capa
 * adicional, no como un requisito para reservar.
 */

const SUPABASE_ENV_VARS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export function getMissingSupabaseEnvVars(): string[] {
  return SUPABASE_ENV_VARS.filter((key) => !process.env[key]);
}

export function isSupabaseConfigured(): boolean {
  return getMissingSupabaseEnvVars().length === 0;
}

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  if (!cached) {
    cached = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return cached;
}
