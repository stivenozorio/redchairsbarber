import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";

interface ActionResult {
  ok: boolean;
  error: string | null;
}

/** Cancelar/reprogramar la propia reserva desde "Mi cuenta", contra los
 * mismos /api/cancel y /api/reschedule que usa la reserva de invitado
 * en /reservar — pero enviando el token de sesión, que el servidor
 * ahora exige cuando la reserva tiene cuenta (ver api/cancel.ts). */
export function useMyBookingActions() {
  const { session } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    return headers;
  }, [session]);

  const cancelBooking = useCallback(
    async (eventId: string, barberId: string): Promise<ActionResult> => {
      setCancelling(true);
      try {
        const res = await fetch("/api/cancel", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ eventId, barberId }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "No se pudo cancelar la reserva." };
        }
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: "Error de conexión. Intenta de nuevo." };
      } finally {
        setCancelling(false);
      }
    },
    [authHeaders]
  );

  const rescheduleBooking = useCallback(
    async (eventId: string, barberId: string, date: string, time: string): Promise<ActionResult> => {
      setRescheduling(true);
      try {
        const res = await fetch("/api/reschedule", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ eventId, barberId, date, time }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "No se pudo reprogramar la reserva." };
        }
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: "Error de conexión. Intenta de nuevo." };
      } finally {
        setRescheduling(false);
      }
    },
    [authHeaders]
  );

  return { cancelBooking, rescheduleBooking, cancelling, rescheduling };
}
