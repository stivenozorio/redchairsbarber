import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";

interface BlockSlotInput {
  barberId: string;
  date: string;
  time: string;
  durationMinutes: number;
  note?: string;
}

interface BlockSlotResult {
  ok: boolean;
  error: string | null;
}

/** Crea un bloqueo de horario vía /api/staff/block-slot (mismo patrón
 * que useUpdateBookingStatus): el servidor valida que un barbero solo
 * bloquee su propia agenda y que el horario esté realmente libre. */
export function useBlockSlot() {
  const { session } = useAuth();
  const [blocking, setBlocking] = useState(false);

  const blockSlot = useCallback(
    async (input: BlockSlotInput): Promise<BlockSlotResult> => {
      if (!session?.access_token) return { ok: false, error: "No has iniciado sesión." };

      setBlocking(true);
      try {
        const res = await fetch("/api/staff/block-slot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(input),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "No se pudo bloquear el horario." };
        }
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: "Error de conexión. Intenta de nuevo." };
      } finally {
        setBlocking(false);
      }
    },
    [session]
  );

  return { blockSlot, blocking };
}
