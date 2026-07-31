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

/** A diferencia de getUserIdFromRequest (donde "sin sesión" es un caso
 * válido: reservar sin cuenta debe funcionar), los endpoints del panel
 * administrativo deben fallar fuerte si quien llama no es un admin real. */
export class AdminAuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

/** Valida el token de sesión y que el perfil correspondiente tenga
 * role='admin'. Se consulta con la service-role key (se salta RLS) porque
 * es el propio chequeo que decide si el resto de la petición procede. */
export async function requireAdminUserId(req: VercelRequest): Promise<string> {
  const userId = await getUserIdFromRequest(req);
  if (!userId) throw new AdminAuthError("Debes iniciar sesión.", 401);

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new AdminAuthError("El sistema de administración no está disponible.", 500);

  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error || !data || data.role !== "admin") {
    throw new AdminAuthError("No tienes permisos de administrador.", 403);
  }
  return userId;
}
