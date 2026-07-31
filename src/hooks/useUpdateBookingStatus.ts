import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";
import type { BookingStatus } from "../types/club";

interface UpdateResult {
  ok: boolean;
  error: string | null;
}

/** Cambia el estado de una reserva vía /api/admin/booking-status (no
 * escribe directo a Supabase: cancelar también debe liberar el evento de
 * Google Calendar, y eso solo lo puede hacer el servidor). */
export function useUpdateBookingStatus() {
  const { session } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateStatus = useCallback(
    async (bookingId: string, status: BookingStatus): Promise<UpdateResult> => {
      if (!session?.access_token) return { ok: false, error: "No has iniciado sesión." };

      setUpdatingId(bookingId);
      try {
        const res = await fetch("/api/admin/booking-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ bookingId, status }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) return { ok: false, error: data.error ?? "No se pudo actualizar la reserva." };
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: "Error de conexión. Intenta de nuevo." };
      } finally {
        setUpdatingId(null);
      }
    },
    [session]
  );

  return { updateStatus, updatingId };
}
