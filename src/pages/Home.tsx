import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaCut,
  FaGem,
  FaHandSparkles,
  FaSprayCan,
  FaUserTie,
} from "react-icons/fa";
import Reveal from "../components/Reveal";
import SectionHeading from "../components/SectionHeading";
import ServiceCard from "../components/ServiceCard";
import LoyaltyCard from "../components/LoyaltyCard";
import TestimonialCard from "../components/TestimonialCard";
import GalleryTile from "../components/GalleryTile";
import { LogoBadge } from "../components/Logo";
import { SERVICE_CATEGORIES, VIP_EXPERIENCES } from "../data/services";
import { LOYALTY_TIERS } from "../data/loyalty";
import { TESTIMONIALS } from "../data/testimonials";
import { GALLERY_ITEMS } from "../data/gallery";
import { TAGLINE_SECONDARY } from "../data/site";

const WHY_US = [
  { icon: FaCut, title: "Cortes Modernos", text: "Tendencias, clásicos y personalizados a tu estilo." },
  { icon: FaUserTie, title: "Acabados Perfectos", text: "Degradados, diseños y detalles de alto nivel." },
  { icon: FaSprayCan, title: "Barba Profesional", text: "Perfilado, definición y estilo premium." },
  { icon: FaGem, title: "Productos Premium", text: "Lo mejor para el cuidado de tu cabello y barba." },
  { icon: FaHandSparkles, title: "Ambiente Exclusivo", text: "Buena energía, música y la mejor atención." },
];

export default function Home() {
  const premiumPreview = SERVICE_CATEGORIES.find((c) => c.id === "premium")!.services;

  return (
    <div>
      {/* HERO */}
      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-obsidian">
        <div className="absolute inset-0 bg-radial-fade" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,10,0.4)_0%,rgba(7,7,10,0.85)_75%,#07070a_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #c9a961 0, #c9a961 1px, transparent 1px, transparent 60px)",
          }}
        />

        <div className="container-lux relative z-10 flex flex-col items-center pt-24 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <LogoBadge className="mx-auto mb-10 h-28 w-28 sm:h-32 sm:w-32" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="eyebrow"
          >
            Barbería Premium · Bogotá
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="heading-xl mt-6 max-w-4xl"
          >
            Más que un corte.
            <br />
            <span className="text-blood">Una experiencia</span> premium.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.9 }}
            className="body-muted mt-8 max-w-xl text-lg"
          >
            Descubre una barbería donde cada detalle está pensado para
            ofrecerte una experiencia exclusiva.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.9 }}
            className="mt-12 flex flex-col gap-4 sm:flex-row"
          >
            <Link to="/reservar" className="btn-gold">
              Reservar cita
            </Link>
            <Link to="/servicios" className="btn-outline">
              Ver servicios
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-widest2 text-bone/50"
          >
            {TAGLINE_SECONDARY.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
          <div className="h-10 w-6 rounded-full border border-gold/40 p-1">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="h-1.5 w-1.5 rounded-full bg-gold"
            />
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="border-t border-gold/10 bg-obsidian py-28">
        <div className="container-lux">
          <SectionHeading
            eyebrow="La diferencia Red Chairs"
            title="¿Por qué elegir Red Chairs?"
            subtitle="No ofrecemos solo un servicio de barbería. Ofrecemos un estándar de excelencia en cada visita."
          />
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {WHY_US.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <div className="card-lux h-full text-center">
                  <item.icon className="mx-auto text-gold" size={30} />
                  <h3 className="mt-6 font-display text-lg text-ivory">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-bone/60">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICIOS PREMIUM PREVIEW */}
      <section className="border-t border-gold/10 bg-charcoal py-28">
        <div className="container-lux">
          <SectionHeading
            eyebrow="Nuestro menú"
            title="Servicios Premium"
            subtitle="Cada servicio está diseñado como un ritual, no como un trámite."
          />
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {premiumPreview.map((s, i) => (
              <ServiceCard key={s.name} service={s} delay={i * 0.1} />
            ))}
          </div>
          <Reveal delay={0.3} className="mt-14 flex justify-center">
            <Link to="/servicios" className="btn-outline">
              Ver todos los servicios
            </Link>
          </Reveal>
        </div>
      </section>

      {/* EXPERIENCIA VIP */}
      <section className="relative overflow-hidden border-t border-gold/10 bg-obsidian py-28">
        <div className="absolute inset-0 bg-radial-fade opacity-70" />
        <div className="container-lux relative grid gap-16 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow justify-start before:hidden">Solo para ti</p>
            <h2 className="heading-lg mt-5">
              La <span className="text-gold">Experiencia VIP</span>
            </h2>
            <p className="body-muted mt-6 max-w-lg text-lg">
              1:30 a 2 horas de pura experiencia. Corte premium, barba
              perfecta, spa facial, masajes de relajación total y atención
              personalizada en un ambiente exclusivo, solo para ti.
            </p>
            <Link to="/experiencia-vip" className="btn-gold mt-10 inline-flex">
              Descubrir la Experiencia VIP
            </Link>
          </Reveal>
          <div className="grid grid-cols-3 gap-4">
            {VIP_EXPERIENCES.map((v, i) => (
              <Reveal key={v.name} delay={i * 0.12} className={i === 1 ? "sm:-translate-y-6" : ""}>
                <div className="card-lux flex h-full flex-col items-center justify-center text-center">
                  <p className="font-display text-2xl font-semibold text-gold">{v.price}</p>
                  <p className="mt-3 text-xs uppercase tracking-widest2 text-bone/60">
                    {v.name}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FIDELIZACION PREVIEW */}
      <section className="border-t border-gold/10 bg-charcoal py-28">
        <div className="container-lux">
          <SectionHeading
            eyebrow="Programa gratuito"
            title="Programa de Fidelización"
            subtitle="Mientras más nos visitas, más beneficios exclusivos desbloqueas. Automático, sin costo."
          />
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LOYALTY_TIERS.map((tier, i) => (
              <LoyaltyCard key={tier.id} tier={tier} delay={i * 0.1} />
            ))}
          </div>
          <Reveal delay={0.3} className="mt-14 flex justify-center">
            <Link to="/fidelizacion" className="btn-outline">
              Conocer el programa completo
            </Link>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="border-t border-gold/10 bg-obsidian py-28">
        <div className="container-lux">
          <SectionHeading
            eyebrow="Voces Red Chairs"
            title="Lo que dicen nuestros clientes"
          />
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={t.name} t={t} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* GALERIA */}
      <section className="border-t border-gold/10 bg-charcoal py-28">
        <div className="container-lux">
          <SectionHeading eyebrow="Galería" title="El estilo Red Chairs" />
          <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
            {GALLERY_ITEMS.map((item, i) => (
              <GalleryTile key={item.label} item={item} index={i} delay={(i % 4) * 0.08} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden border-t border-gold/10 bg-obsidian py-32">
        <div className="absolute inset-0 bg-radial-fade" />
        <div className="container-lux relative text-center">
          <Reveal>
            <p className="eyebrow">Reserva ahora</p>
            <h2 className="heading-xl mt-6">
              Tu mejor versión <span className="text-gold">te espera</span>
            </h2>
            <p className="body-muted mx-auto mt-6 max-w-xl text-lg">
              Agenda tu cita hoy y vive la experiencia que solo Red Chairs
              Barber puede ofrecerte.
            </p>
            <div className="mt-12 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/reservar" className="btn-gold">
                Reservar cita
              </Link>
              <Link to="/contacto" className="btn-outline">
                Contáctanos
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
