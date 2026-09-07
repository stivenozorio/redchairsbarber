import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface ActiveProduct {
  id: string;
  name: string;
  category: string | null;
  price_cop: number;
  points_cost: number;
  description: string | null;
  image_url: string | null;
}

/**
 * Catálogo de productos activos, leído en vivo de Supabase —
 * `products_select_all` (RLS) permite lectura pública, así que esta
 * consulta funciona con la anon key, igual que useServiceOverrides.
 * Lo usan tanto la página pública `/productos` como el selector de
 * "Canjear puntos presencial" en ClientProfileModal.
 *
 * `null` mientras no haya datos (Supabase no configurado, o la
 * consulta todavía no responde/falló) — a diferencia de los
 * servicios, un producto no tiene catálogo estático de respaldo en el
 * código, así que en ese caso simplemente no hay nada que mostrar.
 */
export function useActiveProducts(): ActiveProduct[] | null {
  const [products, setProducts] = useState<ActiveProduct[] | null>(null);

  useEffect(() => {
    let active = true;
    if (!supabase) return;

    supabase
      .from("products")
      .select("id, name, category, price_cop, points_cost, description, image_url")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        setProducts(data as ActiveProduct[]);
      });

    return () => {
      active = false;
    };
  }, []);

  return products;
}
