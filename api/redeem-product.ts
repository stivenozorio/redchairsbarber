import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserIdFromRequest } from "./_lib/auth.js";
import { redeemProductForPoints } from "./_lib/pointsRepo.js";
import { InvalidScheduleInputError } from "./_lib/schedule.js";
import { sendApiError } from "./_lib/http.js";

/**
 * Canje de un producto EN LÍNEA, desde /productos — el cliente
 * descuenta sus propios puntos, sin pasar por el mostrador. A
 * diferencia del canje presencial (api/staff/redeem-points.ts), este
 * lo llama directamente el cliente autenticado, nunca un miembro del
 * staff en su nombre.
 *
 * Sin control de existencias (decisión explícita del negocio): esto no
 * verifica stock porque el catálogo de productos no lo tiene. El
 * producto queda "pendiente" en reward_redemptions hasta que el
 * cliente lo recoge en el local (ver
 * api/staff/fulfill-product-redemption.ts).
 */

interface RequestBody {
  productId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      throw new InvalidScheduleInputError("Debes iniciar sesión para canjear un producto.");
    }

    const { productId } = (req.body ?? {}) as RequestBody;
    if (!productId || typeof productId !== "string") {
      throw new InvalidScheduleInputError("El campo 'productId' es requerido.");
    }

    const result = await redeemProductForPoints(userId, productId);
    if (!result.ok) {
      res.status(409).json({ error: result.error ?? "No se pudo procesar el canje." });
      return;
    }

    res.status(200).json({
      success: true,
      newBalance: result.newBalance,
      redemptionId: result.redemptionId,
    });
  } catch (error) {
    sendApiError(res, error);
  }
}
