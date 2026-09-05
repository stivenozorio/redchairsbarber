import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Ids de barberos activos, leídos en vivo de Supabase — para que el
 * selector de /reservar deje de ofrecer a alguien que un admin acaba
 * de desactivar (ej. ya no trabaja ahí) sin tener que esperar un
 * despliegue. `barbers_select_all` (RLS) permite lectura pública, así
 * que esta consulta funciona con la anon key, igual que
 * useServiceOverrides.
 *
 * `null` mientras no haya datos (Supabase no configurado, o la
 * consulta todavía no responde/falló): en ese caso el llamador debe
 * mostrar todos los barberos del catálogo estático, igual que el
 * servidor cuando el catálogo vivo no está disponible.
 */
export function useActiveBarberIds(): Set<string> | null {
  const [activeIds, setActiveIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    let active = true;
    if (!supabase) return;

    supabase
      .from("barbers")
      .select("id")
      .eq("active", true)
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        setActiveIds(new Set(data.map((row) => row.id as string)));
      });

    return () => {
      active = false;
    };
  }, []);

  return activeIds;
}
