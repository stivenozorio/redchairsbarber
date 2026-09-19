import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";

interface PointsAdjustmentResult {
  ok: boolean;
  newBalance: number | null;
  error: string | null;
}

/** Ajustes de puntos hechos a mano por un administrador desde
 * /admin/clientes — contra /api/staff/redeem-points, que soporta dos
 * acciones sobre el mismo endpoint (ver comentario ahí): "redeem"
 * (canje presencial, descuenta) y "award" (asignación manual, suma —
 * ej. el premio de un concurso a alguien que recién se creó la
 * cuenta). Mismo patrón que useProductRedemptionActions. */
export function useAdminRedeemPoints() {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);

  const call = useCallback(
    async (
      action: "redeem" | "award",
      userId: string,
      points: number,
      description: string
    ): Promise<PointsAdjustmentResult> => {
      setSaving(true);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

        const res = await fetch("/api/staff/redeem-points", {
          method: "POST",
          headers,
          body: JSON.stringify({ action, userId, points, description }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          newBalance?: number;
        };
        if (!res.ok) {
          return { ok: false, newBalance: null, error: data.error ?? "No se pudo registrar el ajuste." };
        }
        return { ok: true, newBalance: data.newBalance ?? null, error: null };
      } catch {
        return { ok: false, newBalance: null, error: "Error de conexión. Intenta de nuevo." };
      } finally {
        setSaving(false);
      }
    },
    [session]
  );

  const redeem = useCallback(
    (userId: string, points: number, description: string) => call("redeem", userId, points, description),
    [call]
  );
  const award = useCallback(
    (userId: string, points: number, description: string) => call("award", userId, points, description),
    [call]
  );

  return { redeem, award, saving };
}
