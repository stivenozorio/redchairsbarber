import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import SectionHeading from "../components/SectionHeading";
import ServiceCard from "../components/ServiceCard";
import Reveal from "../components/Reveal";
import WhatsAppBookingButton from "../components/WhatsAppBookingButton";
import { SERVICE_CATEGORIES, applyLiveOverrides } from "../data/services";
import { useServiceOverrides } from "../hooks/useServiceOverrides";

export default function Services() {
  // Mismos precios que Inicio/Reservar en vez de los fijos del código
  // — ver hooks/useServiceOverrides.ts.
  const serviceOverrides = useServiceOverrides();
  const liveCategories = SERVICE_CATEGORIES.map((category) => ({
    ...category,
    services: applyLiveOverrides(category.services, serviceOverrides),
  }));

  return (
    <div>
      <PageHero
        eyebrow="Nuestro menú"
        title="Servicios"
        subtitle="Cada experiencia está diseñada con precisión, dedicación y los mejores productos del mercado."
      />

      <section className="border-b border-gold/10 bg-charcoal py-16">
        <div className="container-lux grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="eyebrow justify-start before:hidden">Clásicos</p>
            <p className="mt-3 text-sm leading-relaxed text-bone/70">
              El servicio esencial, rápido y bien hecho — corte, barba o afeitado sin vueltas.
            </p>
          </div>
          <div>
            <p className="eyebrow justify-start before:hidden">Premium</p>
            <p className="mt-3 text-sm leading-relaxed text-bone/70">
              La misma base, pero como experiencia completa: diagnóstico visajista, masaje
              relajante y más tiempo dedicado a cada detalle.
            </p>
          </div>
          <div>
            <p className="eyebrow justify-start before:hidden">Combos</p>
            <p className="mt-3 text-sm leading-relaxed text-bone/70">
              Varios servicios en una sola cita, a un precio conjunto más bajo que pedirlos por
              separado.
            </p>
          </div>
          <div>
            <p className="eyebrow justify-start before:hidden">Extras</p>
            <p className="mt-3 text-sm leading-relaxed text-bone/70">
              Detalles cortos que puedes sumar a cualquier corte — cejas, lavado capilar, y los
              upgrades de la sección Relax.
            </p>
          </div>
        </div>
      </section>

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

      {liveCategories.map((category, idx) => (
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

      <section className="border-b border-gold/10 bg-charcoal py-20">
        <div className="container-lux text-center">
          <Reveal>
            <h2 className="heading-lg">
              También tenemos <span className="text-gold">productos</span>
            </h2>
            <p className="body-muted mx-auto mt-5 max-w-xl text-lg">
              Pomadas, tratamientos y kits para seguir el cuidado desde casa — cómpralos o
              canjéalos con tus puntos RED CLUB.
            </p>
            <div className="mt-8">
              <Link to="/productos" className="btn-outline">
                Ver productos
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

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
              <WhatsAppBookingButton />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
