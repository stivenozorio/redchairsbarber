import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el navegador.
 *
 * Usa la ANON KEY, que es pública por diseño: lo que protege los datos
 * es Row Level Security en la base, no el secreto de esta llave.
 *
 * Devuelve `null` si las variables no están configuradas. Esto es
 * deliberado: el sitio público (inicio, servicios, reservar, contacto)
 * debe seguir funcionando exactamente igual aunque RED CLUB todavía no
 * esté conectado. La interfaz del club simplemente no se muestra.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        // Mantener la sesión iniciada entre recargas y pestañas.
        persistSession: true,
        autoRefreshToken: true,
        // Necesario para completar el login con Google, que vuelve al
        // sitio con los tokens en la URL.
        detectSessionInUrl: true,
        storageKey: "redchairs.auth",
      },
    })
  : null;

/** Igual que `supabase`, pero lanza si no está configurado. Úsalo solo
 * dentro de código que ya verificó `isSupabaseConfigured`. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado. Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY."
    );
  }
  return supabase;
}
