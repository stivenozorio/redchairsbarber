import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireStaffUserId, StaffAuthError } from "../_lib/auth.js";
import { adminRedeemPoints, adminAwardPoints } from "../_lib/pointsRepo.js";
import { InvalidScheduleInputError } from "../_lib/schedule.js";
import { sendApiError } from "../_lib/http.js";

/**
 * Ajustes de puntos hechos a mano por un administrador desde
 * /admin/clientes, sin pasar por /reservar ni por un canje en línea:
 *
 * - `action: "redeem"` (por defecto, retrocompatible): un cliente pagó
 *   en la barbería con puntos — se le descuentan.
 * - `action: "award"`: asignarle puntos manualmente (premio de un
 *   concurso, cortesía, corrección de un error) — se le suman.
 *
 * Los dos comparten un solo endpoint (en vez de uno nuevo) por el
 * límite de funciones serverless del plan Hobby de Vercel — ver la
 * nota en el README. Solo `role = 'admin'` puede usar cualquiera de
 * las dos: a diferencia de booking-status.ts o block-slot.ts, que sí
 * comparten barbero+admin, dejar que cualquier barbero toque el saldo
 * de puntos de un cliente sin más control abre la puerta a errores o
 * abuso difíciles de auditar.
 */

interface RequestBody {
  action?: "redeem" | "award";
  userId?: string;
  points?: number;
  description?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const identity = await requireStaffUserId(req);
    if (identity.role !== "admin") {
      throw new StaffAuthError("Solo un administrador puede ajustar los puntos de un cliente.", 403);
    }

    const { action = "redeem", userId, points, description } = (req.body ?? {}) as RequestBody;
    if (action !== "redeem" && action !== "award") {
      throw new InvalidScheduleInputError("El campo 'action' debe ser 'redeem' o 'award'.");
    }

    if (!userId || typeof userId !== "string") {
      throw new InvalidScheduleInputError("El campo 'userId' es requerido.");
    }
    if (typeof points !== "number" || !Number.isFinite(points) || points <= 0) {
      throw new InvalidScheduleInputError("El campo 'points' debe ser un número mayor a cero.");
    }
    const trimmedDescription = typeof description === "string" ? description.trim() : "";
    if (!trimmedDescription) {
      throw new InvalidScheduleInputError(
        action === "award" ? "Describe el motivo (ej. premio de un concurso)." : "Describe qué se canjeó (ej. el servicio entregado)."
      );
    }

    const result =
      action === "award"
        ? await adminAwardPoints(identity.userId, userId, Math.floor(points), `Ajuste manual — ${trimmedDescription}`)
        : await adminRedeemPoints(identity.userId, userId, Math.floor(points), `Canje presencial — ${trimmedDescription}`);

    if (!result.ok) {
      res.status(409).json({ error: result.error ?? "No se pudo registrar el ajuste." });
      return;
    }

    res.status(200).json({ success: true, newBalance: result.newBalance });
  } catch (error) {
    sendApiError(res, error);
  }
}
