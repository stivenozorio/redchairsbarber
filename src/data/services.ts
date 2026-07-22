export interface Service {
  name: string;
  price: string;
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
        description:
          "Experiencia personalizada con diagnóstico visajista, peinado premium y toque final con loción.",
      },
      {
        name: "Recorte de Barba Sencillo",
        price: "$10.000",
        description: "Asesoría y diseño de barba, afeitado con gel y toque final con loción.",
      },
      {
        name: "Afeitados",
        price: "$15.000",
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
        description: "Experiencia personalizada que incluye:",
        includes: ["Diagnóstico visajista", "Masaje relajante", "Peinado premium", "Toque final con loción"],
      },
      {
        name: "Corte Premium + Barba",
        price: "$40.000",
        description: "Incluye corte premium + experiencia de barba.",
        includes: ["Masaje relajante", "Peinado premium", "Toque final con loción"],
      },
      {
        name: "Barba Premium",
        price: "$25.000",
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
        description:
          "Mascarilla aplicada en toda la cara para limpieza profunda, hidratación y revitalización facial.",
      },
      {
        name: "Masaje Ocular",
        price: "$12.000",
        description: "Incluye masaje relajante con masajeador profesional para ojos.",
      },
    ],
  },
  {
    id: "combos",
    title: "Combos",
    subtitle: "Todo lo que necesitas",
    services: [
      { name: "Corte + Cejas", price: "$25.000" },
      { name: "Corte Plus + Cejas", price: "$35.000" },
      { name: "Corte + Barba", price: "$30.000" },
      { name: "Corte Plus + Barba", price: "$40.000" },
      { name: "Corte + Barba + Cejas", price: "$35.000" },
    ],
  },
  {
    id: "extras",
    title: "Extras",
    subtitle: "Detalles que marcan la diferencia",
    services: [
      { name: "Cejas", price: "$5.000", description: "Se realiza con cuchilla." },
      { name: "Lavado Capilar", price: "$5.000" },
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
        description: "Mascarilla de carbón activado + masaje relajante en cuello, hombros y cabeza.",
      },
      {
        name: "Descanso Visual",
        price: "+$10.000",
        description: "Parches de colágeno bajo los ojos + masaje ocular.",
      },
    ],
  },
];

export const VIP_EXPERIENCES: Service[] = [
  {
    name: "Experiencia VIP",
    price: "$65.000",
    description: "Corte Plus + Spa Facial + Lavado Capilar",
  },
  {
    name: "Experiencia VIP + Barba",
    price: "$75.000",
    description: "Corte Plus + Spa Facial + Lavado Capilar + Barba Premium",
  },
  {
    name: "Experiencia VIP + Barba + Cejas",
    price: "$81.000",
    description: "Corte Plus + Spa Facial + Lavado Capilar + Barba Premium + Cejas",
  },
];
