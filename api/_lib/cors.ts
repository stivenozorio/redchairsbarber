import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * CORS para cuando el frontend vive en un dominio distinto al backend
 * — por ejemplo, el sitio estático en GoDaddy (redchairsbarber.digicyus.com)
 * llamando a las funciones serverless que se quedaron en Vercel. Ver
 * README → "Frontend y backend en dominios distintos".
 *
 * Mientras frontend y backend compartan dominio (todo en Vercel, como
 * hasta ahora), esto no hace nada: el navegador nunca manda `Origin`
 * en una petición del mismo sitio, así que no hay cabecera que agregar.
 *
 * Lista separada por comas en la variable de entorno ALLOWED_ORIGINS,
 * por ejemplo:
 *   ALLOWED_ORIGINS=https://redchairsbarber.digicyus.com
 *
 * No hace falta `Access-Control-Allow-Credentials`: la sesión viaja en
 * el header `Authorization: Bearer <token>` (ver api/_lib/auth.ts),
 * nunca en cookies — así que no hay credenciales de navegador de por
 * medio que proteger.
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * Agrega las cabeceras de CORS si el origen de la petición está en la
 * lista permitida, y responde de una vez a un preflight `OPTIONS` (el
 * navegador lo manda solo, antes de un POST/PATCH con JSON o con el
 * header Authorization, para preguntar si el origen tiene permiso).
 *
 * Devuelve `true` cuando ya se respondió por completo (era un
 * preflight) — el handler que llama a esto debe cortar ahí mismo, sin
 * seguir procesando la petición.
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    // Le dice a cualquier caché intermedio que la respuesta varía según
    // el origen — sin esto, una caché podría servirle a otro dominio
    // una respuesta pensada solo para el primero.
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
