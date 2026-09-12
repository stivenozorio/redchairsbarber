import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireStaffUserId } from "../_lib/auth.js";
import { fulfillProductRedemption } from "../_lib/pointsRepo.js";
import { InvalidScheduleInputError } from "../_lib/schedule.js";
import { sendApiError } from "../_lib/http.js";

/**
 * Confirma que un cliente ya recogió un producto que había canjeado en
 * línea. Cualquier barbero o admin puede hacerlo (no toca puntos, a
 * diferencia de cancelar) — es solo "sí, ya se lo entregué".
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
    const { redemptionId } = (req.body ?? {}) as RequestBody;
    if (!redemptionId || typeof redemptionId !== "string") {
      throw new InvalidScheduleInputError("El campo 'redemptionId' es requerido.");
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
