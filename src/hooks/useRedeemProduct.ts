import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";

interface RedeemResult {
  ok: boolean;
  newBalance: number | null;
  error: string | null;
}

/** Canje de un producto EN LÍNEA desde /productos — contra
 * /api/redeem-product, mismo patrón que useAdminRedeemPoints. */
export function useRedeemProduct() {
  const { session } = useAuth();
  const [redeeming, setRedeeming] = useState(false);

  const redeem = useCallback(
    async (productId: string): Promise<RedeemResult> => {
      setRedeeming(true);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

        const res = await fetch("/api/redeem-product", {
          method: "POST",
          headers,
          body: JSON.stringify({ productId }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; newBalance?: number };
        if (!res.ok) {
          return { ok: false, newBalance: null, error: data.error ?? "No se pudo procesar el canje." };
        }
        return { ok: true, newBalance: data.newBalance ?? null, error: null };
      } catch {
        return { ok: false, newBalance: null, error: "Error de conexión. Intenta de nuevo." };
      } finally {
        setRedeeming(false);
      }
    },
    [session]
  );

  return { redeem, redeeming };
}
