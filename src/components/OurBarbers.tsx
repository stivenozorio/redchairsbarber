import { useState } from "react";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import { BARBERS } from "../data/booking";

/** Foto si existe y carga bien; si no, el círculo con la inicial como
 * respaldo honesto (nunca una foto inventada). Mismo patrón que
 * Avatar en GoogleReviewsCarousel. */
function BarberPhoto({ name, photo }: { name: string; photo?: string }) {
  const [broken, setBroken] = useState(false);

  if (!photo || broken) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-gold/30 bg-charcoal font-display text-3xl text-gold">
        {name.charAt(0)}
      </div>
    );
  }
  return (
    <img
      src={photo}
      alt={name}
      width={96}
      height={96}
      onError={() => setBroken(true)}
      className="h-24 w-24 rounded-full border border-gold/30 object-cover"
    />
  );
}

/** Visible sin cuenta: antes de registrarse, el cliente puede ver
 * quién lo va a atender. */
export default function OurBarbers() {
  const realBarbers = BARBERS.filter((b) => b.id !== "any");

  return (
    <section className="border-t border-gold/10 bg-charcoal py-28">
      <div className="container-lux">
        <SectionHeading
          eyebrow="Tu barbero"
          title="Conoce al equipo"
          subtitle="Dos barberos, un mismo estándar de excelencia en cada corte."
        />
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:max-w-xl sm:mx-auto">
          {realBarbers.map((barber, i) => (
            <Reveal key={barber.id} delay={i * 0.1}>
              <div className="card-lux flex flex-col items-center text-center">
                <BarberPhoto name={barber.name} photo={barber.photo} />
                <h3 className="mt-6 font-display text-xl text-ivory">{barber.name}</h3>
                <p className="mt-2 text-xs uppercase tracking-widest2 text-gold/70">Barbero</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
