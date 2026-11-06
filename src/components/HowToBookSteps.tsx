import { FaGoogle, FaCalendarCheck, FaCheckCircle } from "react-icons/fa";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

const STEPS = [
  {
    icon: FaGoogle,
    text: "Crea tu cuenta, con Google o correo — es necesaria para reservar en la web, porque cada cita que agendes así te suma puntos de RED CLUB.",
  },
  {
    icon: FaCalendarCheck,
    text: "Elige servicio, fecha, hora y barbero.",
  },
  {
    icon: FaCheckCircle,
    text: "Confirma tu cita.",
  },
];

/** Mismo texto y orden en Inicio, Reservar y Registro — para que
 * nadie llegue a crear una cuenta sin saber POR QUÉ hace falta
 * (acumular puntos), no solo que hace falta. Ver también
 * WhatsAppBookingButton para quien prefiere no crear cuenta. */
export default function HowToBookSteps() {
  return (
    <section className="border-y border-gold/10 bg-charcoal py-20">
      <div className="container-lux">
        <SectionHeading eyebrow="Paso a paso" title="¿Cómo reservas tu cita?" />
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.text} delay={i * 0.1}>
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 text-gold">
                  <step.icon size={20} />
                </div>
                <p className="mt-5 font-display text-2xl text-gold">{i + 1}</p>
                <p className="mt-2 text-sm leading-relaxed text-bone/70">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.3}>
          <p className="mt-12 text-center text-sm text-bone/50">
            ¿Prefieres no crear cuenta? Contáctanos directo por WhatsApp.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
