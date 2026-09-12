import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";

interface ActionResult {
  ok: boolean;
  error: string | null;
}

/** Confirmar entrega / cancelar un canje de producto — contra los
 * endpoints de api/staff/*-product-redemption.ts, mismo patrón que
 * useUpdateBookingStatus. */
export function useProductRedemptionActions() {
  const { session } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    return headers;
  }, [session]);

  const call = useCallback(
    async (path: string, redemptionId: string): Promise<ActionResult> => {
      setUpdatingId(redemptionId);
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ redemptionId }),
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

  const fulfill = useCallback(
    (redemptionId: string) => call("/api/staff/fulfill-product-redemption", redemptionId),
    [call]
  );
  const cancel = useCallback(
    (redemptionId: string) => call("/api/staff/cancel-product-redemption", redemptionId),
    [call]
  );

  return { fulfill, cancel, updatingId };
}
