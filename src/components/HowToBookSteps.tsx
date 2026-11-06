import { FaGoogle, FaCalendarCheck, FaCheckCircle } from "react-icons/fa";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

const STEPS = [
  {
    icon: FaGoogle,
    text: "Crea tu cuenta, con Google o correo, es obligatoria para reservar en la web.",
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
 * nadie llegue a crear una cuenta sin saber que es justamente lo que
 * hace falta para reservar en la web (ver también
 * WhatsAppBookingButton para quien prefiere no crear cuenta). */
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
      </div>
    </section>
  );
}
