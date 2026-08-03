import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ClubMemberSummary } from "../types/club";

interface UseMemberSummaryResult {
  summary: ClubMemberSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** Resumen de socio (nivel, puntos, visitas) para la tarjeta digital de
 * "Mi cuenta". Lee la vista club_member_summary (ya existe desde la
 * Fase 1: security_invoker=true, así que un cliente solo puede ver su
 * propia fila — RLS de profiles/points_transactions lo garantiza). */
export function useMemberSummary(userId: string | undefined): UseMemberSummaryResult {
  const [summary, setSummary] = useState<ClubMemberSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !userId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("club_member_summary")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error cargando el resumen de socio:", fetchError);
      setError(fetchError.message);
      setSummary(null);
    } else {
      setSummary((data as ClubMemberSummary) ?? null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { summary, loading, error, reload: load };
}
