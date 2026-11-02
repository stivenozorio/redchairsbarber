/**
 * URL base de la API. Vacía por defecto: las funciones serverless
 * viven bajo /api del mismo dominio, como hasta ahora.
 *
 * Solo hace falta configurarla cuando el frontend se despliega en un
 * dominio distinto al backend — por ejemplo, el sitio estático en
 * GoDaddy (redchairsbarber.digicyus.com) llamando a las funciones que
 * se quedaron en Vercel. Ver README → "Frontend y backend en dominios
 * distintos".
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

/** Antepone la URL base a una ruta de API (ej. "/api/book"). */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
