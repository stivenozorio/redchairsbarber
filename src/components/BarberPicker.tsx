import { useState } from "react";
import { FaUsers } from "react-icons/fa";
import type { Barber } from "../data/booking";

/** Igual patrón que Avatar en GoogleReviewsCarousel: si la foto no
 * carga, cae a un ícono genérico en vez de romperse. */
function PortraitImage({ barber, selected }: { barber: Barber; selected: boolean }) {
  const [broken, setBroken] = useState(false);

  if (barber.id === "any" || !barber.photo || broken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-charcoal">
        <FaUsers className={`transition-colors duration-300 ${selected ? "text-gold/70" : "text-bone/30"}`} size={34} />
      </div>
    );
  }
  return (
    <img
      src={barber.photo}
      alt=""
      onError={() => setBroken(true)}
      className={`h-full w-full object-cover object-top transition-all duration-300 ${
        selected ? "grayscale-0" : "grayscale"
      }`}
    />
  );
}

/**
 * Selector de barbero estilo "pantalla de selección de personaje": cada
 * tarjeta es un retrato grande, y la elegida resalta con brillo dorado
 * y escala, como un cursor de selección — en vez de un <select> plano.
 * Pensado sobre todo para celular: fila horizontal con scroll/snap.
 */
export default function BarberPicker({
  barbers,
  value,
  onChange,
}: {
  barbers: Barber[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pt-1" style={{ scrollbarWidth: "thin" }}>
      {barbers.map((barber) => {
        const selected = barber.id === value;
        return (
          <button
            key={barber.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(barber.id)}
            className={`relative aspect-[3/4] w-28 shrink-0 snap-start overflow-hidden rounded-sm border-2 bg-obsidian transition-all duration-300 sm:w-32 ${
              selected
                ? "scale-105 border-gold shadow-[0_0_24px_rgba(201,169,97,0.45)]"
                : "border-gold/15 opacity-70 hover:opacity-100"
            }`}
          >
            <PortraitImage barber={barber} selected={selected} />
            <div
              className={`absolute inset-x-0 bottom-0 border-t px-2 py-2 text-center transition-colors duration-300 ${
                selected ? "border-gold/40 bg-obsidian/80" : "border-gold/10 bg-obsidian/70"
              }`}
            >
              <p
                className={`truncate text-[11px] uppercase tracking-widest2 transition-colors duration-300 ${
                  selected ? "text-gold" : "text-bone/60"
                }`}
              >
                {barber.name}
              </p>
            </div>
            {selected && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_rgba(201,169,97,0.8)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
