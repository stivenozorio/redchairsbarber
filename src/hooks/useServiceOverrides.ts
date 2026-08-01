import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatPriceNumber, type ServiceOverride } from "../data/services";

interface ServiceRow {
  id: string;
  price_cop: number;
  duration_minutes: number;
}

/**
 * Precio/duración vivos por id de servicio, para que el formulario de
 * reservas refleje de inmediato lo que se edite en el panel
 * administrativo (antes solo lo veía el servidor al validar/crear la
 * reserva — el cliente seguía viendo los valores estáticos del archivo
 * mientras elegía servicios).
 *
 * `services_select_all` (RLS) permite lectura pública, así que esta
 * consulta funciona con la anon key. `null` mientras no haya datos
 * (Supabase no configurado, o la consulta falló): en ese caso el
 * llamador debe seguir usando los valores estáticos, igual que el
 * servidor cuando el catálogo vivo no está disponible.
 */
export function useServiceOverrides(): Record<string, ServiceOverride> | null {
  const [overrides, setOverrides] = useState<Record<string, ServiceOverride> | null>(null);

  useEffect(() => {
    let active = true;
    if (!supabase) return;

    supabase
      .from("services")
      .select("id, price_cop, duration_minutes")
      .eq("active", true)
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        const map: Record<string, ServiceOverride> = {};
        for (const row of data as ServiceRow[]) {
          map[row.id] = { price: formatPriceNumber(row.price_cop), durationMinutes: row.duration_minutes };
        }
        setOverrides(map);
      });

    return () => {
      active = false;
    };
  }, []);

  return overrides;
}
