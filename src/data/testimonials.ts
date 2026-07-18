export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  rating: number;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Santiago R.",
    role: "Cliente LEGEND",
    quote:
      "No es una barbería más, es un ritual. Desde que entras hasta que sales sientes que te trataron como alguien importante.",
    rating: 5,
  },
  {
    name: "Andrés M.",
    role: "Cliente GOLD",
    quote:
      "La Experiencia VIP cambió mi forma de ver un corte de cabello. El spa facial y los masajes son otro nivel.",
    rating: 5,
  },
  {
    name: "Camilo D.",
    role: "Cliente RED",
    quote:
      "Ambiente exclusivo, atención personalizada y resultados impecables. Ya no voy a ningún otro lado.",
    rating: 5,
  },
  {
    name: "Juan Pablo T.",
    role: "Cliente BLACK",
    quote:
      "Desde la primera visita me sentí bienvenido. Se nota que cada detalle está pensado para el cliente.",
    rating: 5,
  },
];
