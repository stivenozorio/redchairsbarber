import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PointsTransactionRow } from "../types/club";

const HISTORY_LIMIT = 100;

interface UsePointsHistoryResult {
  transactions: PointsTransactionRow[];
  loading: boolean;
  error: string | null;
}

/**
 * Historial de movimientos de puntos del usuario autenticado (ganados,
 * canjeados, reembolsados), para "Mi cuenta". points_transactions es un
 * ledger append-only (ver 0001_schema.sql): esto solo LEE, nunca
 * modifica ni recalcula ninguna fila — RLS ya garantiza que un cliente
 * solo puede ver las suyas.
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

  return { transactions, loading, error };
}
