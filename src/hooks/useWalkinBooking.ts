import { useCallback, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { apiUrl } from "../lib/apiBase";

export interface WalkinClient {
  id: string;
  full_name: string | null;
  phone: string | null;
}

interface FindOrCreateResult {
  ok: boolean;
  client: WalkinClient | null;
  /** true si el teléfono no coincide con nadie y hace falta el nombre
   * para crear el perfil (ver needsName en la respuesta del servidor). */
  needsName: boolean;
  error: string | null;
}

interface BookInput {
  clientUserId: string;
  barberId: string;
  date: string;
  time: string;
  services: string[];
  notes?: string;
}

interface BookResult {
  ok: boolean;
  error: string | null;
}

/** Dos acciones de api/staff/walkin.ts — ver ahí el porqué de este
 * flujo: un cliente presencial sin cuenta propia, pero con una reserva
 * real (cuenta para puntos y nivel) en vez de solo un bloqueo. */
export function useWalkinBooking() {
  const { session } = useAuth();
  const [finding, setFinding] = useState(false);
  const [booking, setBooking] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    return headers;
  }, [session]);

  const findOrCreateClient = useCallback(
    async (phone: string, fullName?: string): Promise<FindOrCreateResult> => {
      if (!session?.access_token) {
        return { ok: false, client: null, needsName: false, error: "No has iniciado sesión." };
      }
      setFinding(true);
      try {
        const res = await fetch(apiUrl("/api/staff/walkin"), {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ action: "find-or-create-client", phone, fullName }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          client?: WalkinClient;
          needsName?: boolean;
          error?: string;
        };
        if (!res.ok) {
          return {
            ok: false,
            client: null,
            needsName: Boolean(data.needsName),
            error: data.error ?? "No se pudo buscar el cliente.",
          };
        }
        return { ok: true, client: data.client ?? null, needsName: false, error: null };
      } catch {
        return { ok: false, client: null, needsName: false, error: "Error de conexión. Intenta de nuevo." };
      } finally {
        setFinding(false);
      }
    },
    [session, authHeaders]
  );

  const bookForClient = useCallback(
    async (input: BookInput): Promise<BookResult> => {
      if (!session?.access_token) return { ok: false, error: "No has iniciado sesión." };
      setBooking(true);
      try {
        const res = await fetch(apiUrl("/api/staff/walkin"), {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ action: "book", ...input }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          return { ok: false, error: data.error ?? "No se pudo registrar la reserva." };
        }
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: "Error de conexión. Intenta de nuevo." };
      } finally {
        setBooking(false);
      }
    },
    [session, authHeaders]
  );

  return { findOrCreateClient, bookForClient, finding, booking };
}
