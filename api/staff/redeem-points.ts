import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireStaffUserId, StaffAuthError } from "../_lib/auth.js";
import { adminRedeemPoints } from "../_lib/pointsRepo.js";
import { InvalidScheduleInputError } from "../_lib/schedule.js";
import { sendApiError } from "../_lib/http.js";

/**
 * Canje de puntos PRESENCIAL: un cliente pagó en la barbería (no por
 * /reservar) y un administrador registra el descuento manualmente desde
 * /admin/clientes. Solo `role = 'admin'` puede usar este endpoint — a
 * diferencia de booking-status.ts o block-slot.ts, que sí comparte
 * barbero+admin, dejar que cualquier barbero descuente puntos de un
 * cliente sin más control abre la puerta a errores o abuso difíciles de
 * auditar.
 */

interface RequestBody {
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
      throw new StaffAuthError("Solo un administrador puede registrar un canje presencial.", 403);
    }

    const { userId, points, description } = (req.body ?? {}) as RequestBody;

    if (!userId || typeof userId !== "string") {
      throw new InvalidScheduleInputError("El campo 'userId' es requerido.");
    }
    if (typeof points !== "number" || !Number.isFinite(points) || points <= 0) {
      throw new InvalidScheduleInputError("El campo 'points' debe ser un número mayor a cero.");
    }
    const trimmedDescription = typeof description === "string" ? description.trim() : "";
    if (!trimmedDescription) {
      throw new InvalidScheduleInputError("Describe qué se canjeó (ej. el servicio entregado).");
    }

    const result = await adminRedeemPoints(
      identity.userId,
      userId,
      Math.floor(points),
      `Canje presencial — ${trimmedDescription}`
    );

    if (!result.ok) {
      res.status(409).json({ error: result.error ?? "No se pudo registrar el canje." });
      return;
    }

    res.status(200).json({ success: true, newBalance: result.newBalance });
  } catch (error) {
    sendApiError(res, error);
  }
}
