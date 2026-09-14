import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";

interface ActionResult {
  ok: boolean;
  error: string | null;
}

/** Confirmar entrega / cancelar un canje de producto — contra el
 * endpoint fusionado api/staff/product-redemption.ts (antes dos
 * endpoints separados), mismo patrón que useUpdateBookingStatus. */
export function useProductRedemptionActions() {
  const { session } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    return headers;
  }, [session]);

  const call = useCallback(
    async (action: "fulfill" | "cancel", redemptionId: string): Promise<ActionResult> => {
      setUpdatingId(redemptionId);
      try {
        const res = await fetch("/api/staff/product-redemption", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ redemptionId, action }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) return { ok: false, error: data.error ?? "No se pudo completar la acción." };
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: "Error de conexión. Intenta de nuevo." };
      } finally {
        setUpdatingId(null);
      }
    },
    [authHeaders]
  );

  const fulfill = useCallback((redemptionId: string) => call("fulfill", redemptionId), [call]);
  const cancel = useCallback((redemptionId: string) => call("cancel", redemptionId), [call]);

  return { fulfill, cancel, updatingId };
}
