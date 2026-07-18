import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import SectionHeading from "../components/SectionHeading";
import ServiceCard from "../components/ServiceCard";
import Reveal from "../components/Reveal";
import { SERVICE_CATEGORIES } from "../data/services";

export default function Services() {
  return (
    <div>
      <PageHero
        eyebrow="Nuestro menú"
        title="Servicios"
        subtitle="Cada experiencia está diseñada con precisión, dedicación y los mejores productos del mercado."
      />

      <nav className="sticky top-20 z-20 border-y border-gold/10 bg-obsidian/90 backdrop-blur-md">
        <div className="container-lux flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-4">
          {SERVICE_CATEGORIES.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="text-xs uppercase tracking-widest2 text-bone/60 transition-colors hover:text-gold"
            >
              {c.title}
            </a>
          ))}
        </div>
      </nav>

      {SERVICE_CATEGORIES.map((category, idx) => (
        <section
          id={category.id}
          key={category.id}
          className={`scroll-mt-40 border-b border-gold/10 py-24 ${
            idx % 2 === 0 ? "bg-obsidian" : "bg-charcoal"
          }`}
        >
          <div className="container-lux">
            <SectionHeading eyebrow={category.subtitle} title={category.title} />
            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {category.services.map((s, i) => (
                <ServiceCard key={s.name} service={s} delay={i * 0.08} />
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="bg-obsidian py-28">
        <div className="container-lux text-center">
          <Reveal>
            <h2 className="heading-lg">
              ¿Listo para tu <span className="text-gold">mejor versión</span>?
            </h2>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/reservar" className="btn-gold">
                Reservar cita
              </Link>
              <Link to="/experiencia-vip" className="btn-outline">
                Ver Experiencia VIP
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
