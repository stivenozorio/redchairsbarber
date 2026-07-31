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
 * administrativo y del panel del barbero deben fallar fuerte si quien
 * llama no tiene el rol correspondiente. */
export class StaffAuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "StaffAuthError";
    this.status = status;
  }
}

export interface StaffIdentity {
  userId: string;
  role: "barber" | "admin";
  /** Solo relevante cuando role === "barber": el barbers.id vinculado a
   * este perfil (vía barbers.user_id), o null si nadie lo vinculó
   * todavía. Un admin no está acotado a ningún barbero. */
  barberId: string | null;
}

/** Valida el token de sesión y que el perfil correspondiente tenga
 * role='barber' o role='admin'. Se consulta con la service-role key (se
 * salta RLS) porque es el propio chequeo que decide si el resto de la
 * petición procede. Para un barbero, además resuelve su barbers.id para
 * que el endpoint pueda acotar qué reservas puede tocar. */
export async function requireStaffUserId(req: VercelRequest): Promise<StaffIdentity> {
  const userId = await getUserIdFromRequest(req);
  if (!userId) throw new StaffAuthError("Debes iniciar sesión.", 401);

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new StaffAuthError("El sistema de administración no está disponible.", 500);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile || (profile.role !== "barber" && profile.role !== "admin")) {
    throw new StaffAuthError("No tienes permisos para esta acción.", 403);
  }

  if (profile.role === "admin") {
    return { userId, role: "admin", barberId: null };
  }

  const { data: barber } = await supabase
    .from("barbers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  return { userId, role: "barber", barberId: barber?.id ?? null };
}
