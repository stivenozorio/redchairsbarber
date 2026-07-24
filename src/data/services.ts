export interface Service {
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
        name: "Corte de Cabello Sencillo",
        price: "$20.000",
        durationMinutes: 30,
        description:
          "Experiencia personalizada con diagnóstico visajista, peinado premium y toque final con loción.",
      },
      {
        name: "Recorte de Barba Sencillo",
        price: "$10.000",
        durationMinutes: 20,
        description: "Asesoría y diseño de barba, afeitado con gel y toque final con loción.",
      },
      {
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
        name: "Corte Premium",
        price: "$30.000",
        durationMinutes: 40,
        description: "Experiencia personalizada que incluye:",
        includes: ["Diagnóstico visajista", "Masaje relajante", "Peinado premium", "Toque final con loción"],
      },
      {
        name: "Corte Premium + Barba",
        price: "$40.000",
        durationMinutes: 60,
        description: "Incluye corte premium + experiencia de barba.",
        includes: ["Masaje relajante", "Peinado premium", "Toque final con loción"],
      },
      {
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
        name: "Mascarilla Express",
        price: "$15.000",
        durationMinutes: 20,
        description:
          "Mascarilla aplicada en toda la cara para limpieza profunda, hidratación y revitalización facial.",
      },
      {
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
      { name: "Corte + Cejas", price: "$25.000", durationMinutes: 35 },
      { name: "Corte Plus + Cejas", price: "$35.000", durationMinutes: 45 },
      { name: "Corte + Barba", price: "$30.000", durationMinutes: 50 },
      { name: "Corte Plus + Barba", price: "$40.000", durationMinutes: 60 },
      { name: "Corte + Barba + Cejas", price: "$35.000", durationMinutes: 65 },
    ],
  },
  {
    id: "extras",
    title: "Extras",
    subtitle: "Detalles que marcan la diferencia",
    services: [
      { name: "Cejas", price: "$5.000", durationMinutes: 10, description: "Se realiza con cuchilla." },
      { name: "Lavado Capilar", price: "$5.000", durationMinutes: 15 },
    ],
  },
  {
    id: "upgrade",
    title: "Upgrade Relax",
    subtitle: "Convierte tu corte en una experiencia de bienestar",
    services: [
      {
        name: "Renovación Facial",
        price: "+$10.000",
        durationMinutes: 15,
        description: "Mascarilla de carbón activado + masaje relajante en cuello, hombros y cabeza.",
      },
      {
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
    name: "Experiencia VIP",
    price: "$65.000",
    durationMinutes: 90,
    description: "Corte Plus + Spa Facial + Lavado Capilar",
  },
  {
    name: "Experiencia VIP + Barba",
    price: "$75.000",
    durationMinutes: 105,
    description: "Corte Plus + Spa Facial + Lavado Capilar + Barba Premium",
  },
  {
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

export function formatPriceNumber(value: number): string {
  return `$${value.toLocaleString("es-CO")}`;
}

export function getServicesByNames(names: string[]): Service[] {
  return names
    .map((name) => ALL_BOOKABLE_SERVICES.find((s) => s.name === name))
    .filter((s): s is Service => Boolean(s));
}

export interface ServiceTotals {
  totalMinutes: number;
  totalPrice: number;
  services: Service[];
}

/** Sums the duration and price of a set of selected services by name —
 * used both for the live total shown to the client and, authoritatively,
 * on the server when validating availability and creating the event. */
export function sumServiceTotals(names: string[]): ServiceTotals {
  const services = getServicesByNames(names);
  const totals = services.reduce(
    (acc, s) => ({
      totalMinutes: acc.totalMinutes + s.durationMinutes,
      totalPrice: acc.totalPrice + parsePriceToNumber(s.price),
    }),
    { totalMinutes: 0, totalPrice: 0 }
  );
  return { ...totals, services };
}
