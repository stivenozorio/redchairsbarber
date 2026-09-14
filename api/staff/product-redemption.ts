import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireStaffUserId, StaffAuthError } from "../_lib/auth.js";
import { fulfillProductRedemption, cancelProductRedemption } from "../_lib/pointsRepo.js";
import { InvalidScheduleInputError } from "../_lib/schedule.js";
import { sendApiError } from "../_lib/http.js";

/**
 * Acciones sobre un canje de producto pendiente: confirmar entrega o
 * cancelar y devolver puntos. Fusionado en un solo endpoint (antes
 * fulfill-product-redemption.ts y cancel-product-redemption.ts por
 * separado) porque el plan Hobby de Vercel tiene un tope de 12
 * funciones serverless por despliegue y ya se había llegado a 13.
 *
 * - "fulfill": cualquier barbero o admin — no toca puntos, es solo
 *   "sí, ya se lo entregué".
 * - "cancel": SOLO admin — sí toca puntos (mismo criterio que el canje
 *   presencial en redeem-points.ts).
 */

interface RequestBody {
  redemptionId?: string;
  action?: "fulfill" | "cancel";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const identity = await requireStaffUserId(req);
    const { redemptionId, action } = (req.body ?? {}) as RequestBody;

    if (!redemptionId || typeof redemptionId !== "string") {
      throw new InvalidScheduleInputError("El campo 'redemptionId' es requerido.");
    }
    if (action !== "fulfill" && action !== "cancel") {
      throw new InvalidScheduleInputError("El campo 'action' debe ser 'fulfill' o 'cancel'.");
    }

    if (action === "cancel") {
      if (identity.role !== "admin") {
        throw new StaffAuthError("Solo un administrador puede cancelar un canje.", 403);
      }
      const result = await cancelProductRedemption(identity.userId, redemptionId);
      if (!result.ok) {
        res.status(409).json({ error: result.error ?? "No se pudo cancelar el canje." });
        return;
      }
      res.status(200).json({ success: true });
      return;
    }

    const result = await fulfillProductRedemption(identity.userId, redemptionId);
    if (!result.ok) {
      res.status(409).json({ error: result.error ?? "No se pudo registrar la entrega." });
      return;
    }
    res.status(200).json({ success: true });
  } catch (error) {
    sendApiError(res, error);
  }
}
