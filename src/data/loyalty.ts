export interface LoyaltyTier {
  id: string;
  name: string;
  visits: string;
  color: string;
  glow: string;
  benefits: string[];
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: "black",
    name: "BLACK",
    visits: "0 a 4 visitas",
    color: "#2a2a2e",
    glow: "rgba(255,255,255,0.15)",
    benefits: ["Bienvenida exclusiva", "Perfil de cliente", "Noticias y novedades"],
  },
  {
    id: "red",
    name: "RED",
    visits: "5 a 14 visitas",
    color: "#9c1218",
    glow: "rgba(156,18,24,0.45)",
    benefits: [
      "Todo lo de BLACK",
      "Café Premium en cada visita",
      "Prioridad en reservas",
      "Promociones exclusivas",
      "Sorpresa de cumpleaños",
    ],
  },
  {
    id: "gold",
    name: "GOLD",
    visits: "15 a 29 visitas",
    color: "#c9a961",
    glow: "rgba(201,169,97,0.45)",
    benefits: [
      "Todo lo de RED",
      "Invitaciones VIP",
      "Acceso anticipado a promociones",
      "Regalos exclusivos",
      "Experiencias especiales",
    ],
  },
  {
    id: "legend",
    name: "LEGEND",
    visits: "30 visitas o más",
    color: "#f4f1ea",
    glow: "rgba(244,241,234,0.4)",
    benefits: [
      "Todo lo de GOLD",
      "Eventos privados",
      "Máxima prioridad en reservas",
      "Beneficios exclusivos",
      "Reconocimiento como cliente LEGEND",
    ],
  },
];
