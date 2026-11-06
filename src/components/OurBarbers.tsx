import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import { BARBERS } from "../data/booking";

/**
 * Visible sin cuenta: antes de registrarse, el cliente puede ver
 * quién lo va a atender. Sin fotos reales todavía (pendiente de que
 * la barbería las mande) — el círculo con la inicial es un placeholder
 * honesto, no una foto inventada.
 */
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
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-gold/30 bg-charcoal font-display text-3xl text-gold">
                  {barber.name.charAt(0)}
                </div>
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
