import { Link } from "react-router-dom";
import { FaAward, FaGem, FaHandsHelping, FaShieldAlt } from "react-icons/fa";
import PageHero from "../components/PageHero";
import SectionHeading from "../components/SectionHeading";
import Reveal from "../components/Reveal";
import { LogoBadge } from "../components/Logo";
import { FOUNDED } from "../data/site";

const PILLARS = [
  {
    icon: FaGem,
    title: "Lujo",
    text: "Cada rincón, cada producto y cada gesto está pensado para que sientas que estás en un espacio de otro nivel.",
  },
  {
    icon: FaHandsHelping,
    title: "Atención Personalizada",
    text: "No atendemos clientes, atendemos personas. Escuchamos, asesoramos y adaptamos cada servicio a ti.",
  },
  {
    icon: FaAward,
    title: "Calidad",
    text: "Barberos formados, técnicas modernas y productos premium en cada uno de nuestros servicios.",
  },
  {
    icon: FaShieldAlt,
    title: "Confianza",
    text: "Construimos relaciones de largo plazo con nuestros clientes, visita tras visita, año tras año.",
  },
];

export default function About() {
  return (
    <div>
      <PageHero
        eyebrow="Nuestra filosofía"
        title="Nosotros"
        subtitle={`Desde ${FOUNDED}, redefiniendo lo que significa cuidar tu imagen en Bogotá.`}
      />

      <section className="bg-charcoal py-28">
        <div className="container-lux grid gap-16 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <LogoBadge className="mx-auto h-56 w-56 lg:h-72 lg:w-72" />
          </Reveal>
          <Reveal delay={0.15}>
            <p className="eyebrow justify-start before:hidden">La experiencia lo es todo</p>
            <h2 className="heading-lg mt-5">
              Más que una barbería, <span className="text-gold">un estilo de vida</span>
            </h2>
            <p className="body-muted mt-6 text-lg">
              Red Chairs Barber nació de una idea simple: un corte de cabello
              puede ser mucho más que un trámite rápido. Puede ser un momento
              para desconectarte, cuidarte y salir sintiéndote en tu mejor
              versión.
            </p>
            <p className="body-muted mt-4 text-lg">
              Cada silla roja de nuestro espacio representa el mismo
              compromiso: calidad impecable, atención genuina y un ambiente
              donde el lujo se siente en cada detalle, desde el aroma hasta la
              última toalla caliente.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-obsidian py-28">
        <div className="container-lux">
          <SectionHeading
            eyebrow="Lo que nos define"
            title="Nuestros pilares"
            subtitle="Cuatro principios guían cada decisión que tomamos, desde la selección de productos hasta la formación de nuestro equipo."
          />
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.1}>
                <div className="card-lux h-full text-center">
                  <p.icon className="mx-auto text-gold" size={28} />
                  <h3 className="mt-6 font-display text-xl text-ivory">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-bone/60">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-gold/10 bg-charcoal py-28">
        <div className="absolute inset-0 bg-radial-fade opacity-70" />
        <div className="container-lux relative text-center">
          <Reveal>
            <h2 className="heading-lg">
              Tu estilo. Tu actitud. <span className="text-gold">Tu mejor versión.</span>
            </h2>
            <p className="body-muted mx-auto mt-6 max-w-xl text-lg">
              Te invitamos a vivir la experiencia Red Chairs y descubrir por
              qué nuestros clientes no vuelven por costumbre, vuelven por
              convicción.
            </p>
            <Link to="/reservar" className="btn-gold mt-10 inline-flex">
              Reservar cita
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
