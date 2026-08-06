import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";

interface ActionResult {
  ok: boolean;
  error: string | null;
}

/** Bloquear/desbloquear un día completo de la agenda de un barbero,
 * contra /api/staff/day-off — mismo patrón que useBlockSlot. */
export function useDayOff() {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    return headers;
  }, [session]);

  const setDayOff = useCallback(
    async (barberId: string, date: string, note?: string): Promise<ActionResult> => {
      setSaving(true);
      try {
        const res = await fetch("/api/staff/day-off", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ barberId, date, note }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "No se pudo bloquear el día." };
        }
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: "Error de conexión. Intenta de nuevo." };
      } finally {
        setSaving(false);
      }
    },
    [authHeaders]
  );

  const removeDayOff = useCallback(
    async (barberId: string, date: string): Promise<ActionResult> => {
      setSaving(true);
      try {
        const res = await fetch("/api/staff/day-off", {
          method: "DELETE",
          headers: authHeaders(),
          body: JSON.stringify({ barberId, date }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "No se pudo quitar el bloqueo." };
        }
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: "Error de conexión. Intenta de nuevo." };
      } finally {
        setSaving(false);
      }
    },
    [authHeaders]
  );

  return { setDayOff, removeDayOff, saving };
}
