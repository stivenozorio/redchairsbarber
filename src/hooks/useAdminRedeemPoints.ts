import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";

interface RedeemResult {
  ok: boolean;
  newBalance: number | null;
  error: string | null;
}

/** Canje de puntos PRESENCIAL desde el panel administrativo — contra
 * /api/staff/redeem-points, mismo patrón que useDayOff/useBlockSlot. */
export function useAdminRedeemPoints() {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);

  const redeem = useCallback(
    async (userId: string, points: number, description: string): Promise<RedeemResult> => {
      setSaving(true);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

        const res = await fetch("/api/staff/redeem-points", {
          method: "POST",
          headers,
          body: JSON.stringify({ userId, points, description }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          newBalance?: number;
        };
        if (!res.ok) {
          return { ok: false, newBalance: null, error: data.error ?? "No se pudo registrar el canje." };
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

  return { redeem, saving };
}
