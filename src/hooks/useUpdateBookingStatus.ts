import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";
import type { BookingStatus } from "../types/club";

interface UpdateResult {
  ok: boolean;
  error: string | null;
  /** No bloqueante: la operación sí tuvo éxito (Supabase quedó
   * actualizado), pero algo secundario necesita atención — hoy, que
   * cancelar no pudo liberar el horario en Google Calendar. */
  warning: string | null;
}

/** Cambia el estado de una reserva y/o ajusta su duración vía
 * /api/staff/booking-status (la usan tanto el panel administrativo como
 * el del barbero, y el mismo endpoint soporta las dos acciones — ver el
 * comentario ahí). No escribe directo a Supabase: el servidor decide si
 * un barbero puede tocar esa reserva (solo las suyas), valida que un
 * ajuste de duración no choque con la cita siguiente, y solo toca Google
 * Calendar para liberar el horario cuando el nuevo estado es
 * 'cancelled' o para mover el fin del evento al ajustar la duración. */
export function useUpdateBookingStatus() {
  const { session } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const call = useCallback(
    async (bookingId: string, body: Record<string, unknown>): Promise<UpdateResult> => {
      if (!session?.access_token) return { ok: false, error: "No has iniciado sesión.", warning: null };

      setUpdatingId(bookingId);
      try {
        const res = await fetch("/api/staff/booking-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ bookingId, ...body }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          calendarSyncError?: string | null;
        };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "No se pudo actualizar la reserva.", warning: null };
        }
        return { ok: true, error: null, warning: data.calendarSyncError ?? null };
      } catch {
        return { ok: false, error: "Error de conexión. Intenta de nuevo.", warning: null };
      } finally {
        setUpdatingId(null);
      }
    },
    [session]
  );

  const updateStatus = useCallback(
    (bookingId: string, status: BookingStatus) => call(bookingId, { status }),
    [call]
  );
  const updateDuration = useCallback(
    (bookingId: string, durationMinutes: number) => call(bookingId, { durationMinutes }),
    [call]
  );

  return { updateStatus, updateDuration, updatingId };
}
