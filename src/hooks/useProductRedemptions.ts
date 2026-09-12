import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type RedemptionStatus = "pending" | "fulfilled" | "cancelled" | "expired";

export interface ProductRedemptionRow {
  id: string;
  user_id: string;
  product_id: string;
  points_spent: number;
  status: RedemptionStatus;
  fulfilled_at: string | null;
  created_at: string;
  product_name: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
}

/**
 * Canjes de PRODUCTO (reward_redemptions.product_id is not null) para
 * el panel administrativo — mismo patrón de varias consultas simples
 * que useStaffBookings, en vez de una relación embebida atada al
 * cache de esquema de PostgREST.
 */
export function useProductRedemptions(status: "all" | RedemptionStatus) {
  const [redemptions, setRedemptions] = useState<ProductRedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    let query = supabase
      .from("reward_redemptions")
      .select("id, user_id, product_id, points_spent, status, fulfilled_at, created_at")
      .not("product_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (status !== "all") query = query.eq("status", status);

    const { data: rows, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setRedemptions([]);
      setLoading(false);
      return;
    }

    const redemptionRows = (rows as { id: string; user_id: string; product_id: string; points_spent: number; status: RedemptionStatus; fulfilled_at: string | null; created_at: string }[]) ?? [];
    if (redemptionRows.length === 0) {
      setRedemptions([]);
      setLoading(false);
      return;
    }

    const [productsRes, profilesRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name")
        .in("id", [...new Set(redemptionRows.map((r) => r.product_id))]),
      supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", [...new Set(redemptionRows.map((r) => r.user_id))]),
    ]);

    const productNames = new Map(
      ((productsRes.data as { id: string; name: string }[]) ?? []).map((p) => [p.id, p.name])
    );
    const profiles = new Map(
      (
        (profilesRes.data as { id: string; full_name: string | null; email: string | null; phone: string | null }[]) ??
        []
      ).map((p) => [p.id, p])
    );

    setRedemptions(
      redemptionRows.map((r) => {
        const profile = profiles.get(r.user_id);
        return {
          ...r,
          product_name: productNames.get(r.product_id) ?? "Producto eliminado",
          customer_name: profile?.full_name ?? null,
          customer_email: profile?.email ?? null,
          customer_phone: profile?.phone ?? null,
        };
      })
    );
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return { redemptions, loading, error, reload: load, setRedemptions };
}
