import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireStaffUserId, StaffAuthError } from "../_lib/auth.js";
import { cancelProductRedemption } from "../_lib/pointsRepo.js";
import { InvalidScheduleInputError } from "../_lib/schedule.js";
import { sendApiError } from "../_lib/http.js";

/**
 * Cancela un canje de producto pendiente y le devuelve los puntos al
 * cliente. Solo un administrador puede hacerlo (sí toca puntos, a
 * diferencia de confirmar la entrega) — mismo criterio que
 * redeem-points.ts (canje presencial).
 */

interface RequestBody {
  redemptionId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const identity = await requireStaffUserId(req);
    if (identity.role !== "admin") {
      throw new StaffAuthError("Solo un administrador puede cancelar un canje.", 403);
    }

    const { redemptionId } = (req.body ?? {}) as RequestBody;
    if (!redemptionId || typeof redemptionId !== "string") {
      throw new InvalidScheduleInputError("El campo 'redemptionId' es requerido.");
    }

    const result = await cancelProductRedemption(identity.userId, redemptionId);
    if (!result.ok) {
      res.status(409).json({ error: result.error ?? "No se pudo cancelar el canje." });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    sendApiError(res, error);
  }
}
