import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PointsTransactionRow } from "../types/club";

const HISTORY_LIMIT = 100;

interface UsePointsHistoryResult {
  transactions: PointsTransactionRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Historial de movimientos de puntos (ganados, canjeados, reembolsados,
 * ajustados a mano) de un usuario cualquiera — recibe el userId como
 * parámetro, no está atado a la sesión actual, así que sirve tanto para
 * "Mi cuenta" (el propio usuario) como para `ClientProfileModal.tsx`
 * (un admin o barbero viendo la ficha de un cliente). RLS decide qué
 * puede ver cada quien: un cliente solo las suyas (`auth.uid() =
 * user_id`), staff cualquiera (`is_staff()`) — ver 0003_rls.sql.
 * points_transactions es un ledger append-only: esto solo LEE, nunca
 * modifica ni recalcula ninguna fila.
 */
export function usePointsHistory(userId: string | undefined): UsePointsHistoryResult {
  const [transactions, setTransactions] = useState<PointsTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("points_transactions")
      .select("id, amount, reason, description, booking_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);

    if (fetchError) {
      setError(fetchError.message);
      setTransactions([]);
    } else {
      setTransactions((data as PointsTransactionRow[]) ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { transactions, loading, error, reload: load };
}
