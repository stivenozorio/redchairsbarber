import type { VercelRequest } from "@vercel/node";
import { getSupabaseAdmin } from "./supabaseAdmin.js";

/**
 * Identifica al usuario a partir del token que envía el navegador.
 *
 * Deliberadamente NO se acepta un user_id en el cuerpo de la petición:
 * cualquiera podría mandar el id de otra persona y reservar (o luego
 * acumular puntos) a su nombre. El token se valida contra Supabase.
 *
 * Devuelve null para invitados, que es un caso válido: reservar sin
 * cuenta debe seguir funcionando.
 */
export async function getUserIdFromRequest(req: VercelRequest): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) return null;

  const token = header.slice(7).trim();
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch (error) {
    console.error("No se pudo validar el token de sesión:", error);
    return null;
  }
}
