export interface Service {
  /** Identificador estable, espejo de public.services.id en Supabase.
   * No cambiarlo: es la llave que une el historial de reservas con el
   * catálogo. El nombre sí puede cambiar; el id no. */
  id: string;
  name: string;
  price: string;
  /** Estimated appointment length in minutes — used to sum total duration
   * when a client selects multiple services and to check calendar
   * availability for the full combined time. Adjust these to match real
   * service times. */
  durationMinutes: number;
  description?: string;
  includes?: string[];
}

export interface ServiceCategory {
  id: string;
  title: string;
  subtitle: string;
  services: Service[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: "clasicos",
    title: "Servicios Clásicos",
    subtitle: "La base de un buen estilo",
    services: [
      {
        id: "corte-sencillo",
        name: "Corte de Cabello Sencillo",
        price: "$20.000",
        durationMinutes: 30,
        description:
          "Experiencia personalizada con diagnóstico visajista, peinado premium y toque final con loción.",
      },
      {
        id: "recorte-barba-sencillo",
        name: "Recorte de Barba Sencillo",
        price: "$10.000",
        durationMinutes: 20,
        description: "Asesoría y diseño de barba, afeitado con gel y toque final con loción.",
      },
      {
        id: "afeitado",
        name: "Afeitados",
        price: "$15.000",
        durationMinutes: 30,
        description:
          "Ritual de afeitado con vapor ozono, masaje, afeitado con espuma, masaje ocular, toque final con loción e hidratación con agua de rosas.",
      },
    ],
  },
  {
    id: "premium",
    title: "Servicios Premium",
    subtitle: "Eleva tu rutina",
    services: [
      {
        id: "corte-premium",
        name: "Corte Premium",
        price: "$30.000",
        durationMinutes: 40,
        description: "Experiencia personalizada que incluye:",
        includes: ["Diagnóstico visajista", "Masaje relajante", "Peinado premium", "Toque final con loción"],
      },
      {
        id: "corte-premium-barba",
        name: "Corte Premium + Barba",
        price: "$40.000",
        durationMinutes: 60,
        description: "Incluye corte premium + experiencia de barba.",
        includes: ["Masaje relajante", "Peinado premium", "Toque final con loción"],
      },
      {
        id: "barba-premium",
        name: "Barba Premium",
        price: "$25.000",
        durationMinutes: 30,
        description: "El ritual de barba incluye:",
        includes: [
          "Preparación de la piel",
          "Masaje relajante",
          "Afeitado con gel",
          "Aceite hidratante",
          "Toque final con loción",
        ],
      },
    ],
  },
  {
    id: "faciales",
    title: "Servicios Faciales",
    subtitle: "Cuidamos tu piel",
    services: [
      {
        id: "spa-facial",
        name: "Spa Facial",
        price: "$35.000",
        durationMinutes: 45,
        description: "Incluye:",
        includes: [
          "Masaje relajante",
          "Exfoliación facial",
          "Proceso de vapor ozono",
          "Mascarilla a elección (carbono activado, aloe vera o dorada)",
          "Eliminación de impurezas y puntos negros",
          "Hidratación facial según tipo de piel",
          "Humificación con agua de rosas",
        ],
      },
      {
        id: "mascarilla-express",
        name: "Mascarilla Express",
        price: "$15.000",
        durationMinutes: 20,
        description:
          "Mascarilla aplicada en toda la cara para limpieza profunda, hidratación y revitalización facial.",
      },
      {
        id: "masaje-ocular",
        name: "Masaje Ocular",
        price: "$12.000",
        durationMinutes: 15,
        description: "Incluye masaje relajante con masajeador profesional para ojos.",
      },
    ],
  },
  {
    id: "combos",
    title: "Combos",
    subtitle: "Todo lo que necesitas",
    services: [
      { id: "combo-corte-cejas", name: "Corte + Cejas", price: "$25.000", durationMinutes: 35 },
      { id: "combo-corte-plus-cejas", name: "Corte Plus + Cejas", price: "$35.000", durationMinutes: 45 },
      { id: "combo-corte-barba", name: "Corte + Barba", price: "$30.000", durationMinutes: 50 },
      { id: "combo-corte-plus-barba", name: "Corte Plus + Barba", price: "$40.000", durationMinutes: 60 },
      { id: "combo-corte-barba-cejas", name: "Corte + Barba + Cejas", price: "$35.000", durationMinutes: 65 },
    ],
  },
  {
    id: "extras",
    title: "Extras",
    subtitle: "Detalles que marcan la diferencia",
    services: [
      { id: "cejas", name: "Cejas", price: "$5.000", durationMinutes: 10, description: "Se realiza con cuchilla." },
      { id: "lavado-capilar", name: "Lavado Capilar", price: "$5.000", durationMinutes: 15 },
    ],
  },
  {
    id: "upgrade",
    title: "Upgrade Relax",
    subtitle: "Convierte tu corte en una experiencia de bienestar",
    services: [
      {
        id: "upgrade-renovacion-facial",
        name: "Renovación Facial",
        price: "+$10.000",
        durationMinutes: 15,
        description: "Mascarilla de carbón activado + masaje relajante en cuello, hombros y cabeza.",
      },
      {
        id: "upgrade-descanso-visual",
        name: "Descanso Visual",
        price: "+$10.000",
        durationMinutes: 15,
        description: "Parches de colágeno bajo los ojos + masaje ocular.",
      },
    ],
  },
];

export const VIP_EXPERIENCES: Service[] = [
  {
    id: "vip",
    name: "Experiencia VIP",
    price: "$65.000",
    durationMinutes: 90,
    description: "Corte Plus + Spa Facial + Lavado Capilar",
  },
  {
    id: "vip-barba",
    name: "Experiencia VIP + Barba",
    price: "$75.000",
    durationMinutes: 105,
    description: "Corte Plus + Spa Facial + Lavado Capilar + Barba Premium",
  },
  {
    id: "vip-barba-cejas",
    name: "Experiencia VIP + Barba + Cejas",
    price: "$81.000",
    durationMinutes: 120,
    description: "Corte Plus + Spa Facial + Lavado Capilar + Barba Premium + Cejas",
  },
];

/** Flat, bookable catalog — every individual service name is unique across
 * categories and VIP experiences, so the name itself is a stable key. */
export const ALL_BOOKABLE_SERVICES: Service[] = [
  ...VIP_EXPERIENCES,
  ...SERVICE_CATEGORIES.flatMap((c) => c.services),
];

/** Parses a price label ("$30.000", "+$10.000") into a plain integer (COP). */
export function parsePriceToNumber(price: string): number {
  const digits = price.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/** COP por cada punto RED CLUB otorgado — debe coincidir exacto con la
 * fórmula del trigger `award_points_on_completion()` (migración
 * 0017_points_per_service.sql): piso(price_cop_snapshot / 2000). Esto
 * solo sirve para MOSTRARLE al cliente cuánto ganaría antes de reservar
 * — el otorgamiento real y autoritativo sigue pasando en la base de
 * datos cuando la cita se marca "Completada", no aquí. */
const COP_PER_POINT = 2000;

/** Puntos RED CLUB que otorgaría un servicio de este precio, si la cita
 * llega a completarse con una cuenta vinculada. Ver COP_PER_POINT. */
export function calculatePoints(priceCop: number): number {
  return Math.floor(priceCop / COP_PER_POINT);
}

export function formatPriceNumber(value: number): string {
  return `$${value.toLocaleString("es-CO")}`;
}

export interface ServiceOverride {
  name: string;
  price: string;
  durationMinutes: number;
}

/** Superpone nombre/precio/duración leídos en vivo de Supabase (indexados
 * por id) sobre el catálogo estático — categorías y descripciones siguen
 * viniendo del archivo. Un id sin override (todavía no cargó, o Supabase
 * no está configurado) conserva sus valores estáticos tal cual. Lo usa
 * el formulario de reservas para que un cambio hecho en el panel
 * administrativo (incluido renombrar un servicio) se vea de inmediato,
 * no solo al confirmar la cita. */
export function applyLiveOverrides(
  catalog: Service[],
  overridesById: Record<string, ServiceOverride> | null
): Service[] {
  if (!overridesById) return catalog;
  return catalog.map((service) => {
    const override = overridesById[service.id];
    return override
      ? { ...service, name: override.name, price: override.price, durationMinutes: override.durationMinutes }
      : service;
  });
}

/** El id es la llave estable de un servicio (ver el comentario de
 * Service.id más arriba): el nombre se puede editar desde el panel
 * administrativo sin romper una reserva ya seleccionada, en curso, o
 * guardada en el historial. `catalog` defaults to the static list
 * bundled with the app; the server can pass a live catalog fetched from
 * Supabase instead (see api/_lib/catalogRepo.ts), so that editing a
 * price/duration/name from the panel administrativo actually changes
 * what a new booking charges. */
export function getServicesByIds(ids: string[], catalog: Service[] = ALL_BOOKABLE_SERVICES): Service[] {
  return ids
    .map((id) => catalog.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));
}

export interface ServiceTotals {
  totalMinutes: number;
  totalPrice: number;
  /** Suma de calculatePoints() por cada servicio, no calculatePoints()
   * del total — así una reserva con varios servicios coincide con lo
   * que de verdad va a otorgar el trigger, que suma por línea de
   * booking_services (ver 0017_points_per_service.sql). */
  totalPoints: number;
  services: Service[];
}

/** Sums the duration, price and RED CLUB points of a set of selected
 * services by id — used both for the live total shown to the client
 * and, authoritatively, on the server when validating availability and
 * creating the event (points shown here are informational only: el
 * otorgamiento real pasa en la base de datos al completar la cita). */
export function sumServiceTotals(ids: string[], catalog: Service[] = ALL_BOOKABLE_SERVICES): ServiceTotals {
  const services = getServicesByIds(ids, catalog);
  const totals = services.reduce(
    (acc, s) => {
      const priceCop = parsePriceToNumber(s.price);
      return {
        totalMinutes: acc.totalMinutes + s.durationMinutes,
        totalPrice: acc.totalPrice + priceCop,
        totalPoints: acc.totalPoints + calculatePoints(priceCop),
      };
    },
    { totalMinutes: 0, totalPrice: 0, totalPoints: 0 }
  );
  return { ...totals, services };
}
