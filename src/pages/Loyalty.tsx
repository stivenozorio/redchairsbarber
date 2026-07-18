import { Link } from "react-router-dom";
import { FaArrowRight } from "react-icons/fa";
import PageHero from "../components/PageHero";
import SectionHeading from "../components/SectionHeading";
import LoyaltyCard from "../components/LoyaltyCard";
import Reveal from "../components/Reveal";
import { LOYALTY_TIERS } from "../data/loyalty";

export default function Loyalty() {
  return (
    <div>
      <PageHero
        eyebrow="100% gratuito"
        title="Programa de Fidelización"
        subtitle="Mientras más visitas Red Chairs, más beneficios exclusivos desbloqueas. Los niveles se activan automáticamente según tu historial de visitas."
      />

      <section className="bg-charcoal py-24">
        <div className="container-lux">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            {LOYALTY_TIERS.map((tier, i) => (
              <div key={tier.id} className="flex items-center gap-3 sm:gap-6">
                <Reveal delay={i * 0.1}>
                  <span
                    className="rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-widest2"
                    style={{ borderColor: `${tier.color}66`, color: tier.color }}
                  >
                    {tier.name}
                  </span>
                </Reveal>
                {i < LOYALTY_TIERS.length - 1 && (
                  <FaArrowRight className="text-bone/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-obsidian py-28">
        <div className="container-lux">
          <SectionHeading
            eyebrow="Niveles de fidelización"
            title="Tus beneficios crecen contigo"
          />
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LOYALTY_TIERS.map((tier, i) => (
              <LoyaltyCard key={tier.id} tier={tier} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gold/10 bg-charcoal py-28">
        <div className="container-lux grid gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow justify-start before:hidden">Cómo funciona</p>
            <h2 className="heading-lg mt-5">
              Simple, automático y <span className="text-gold">sin costo</span>
            </h2>
            <p className="body-muted mt-6 max-w-lg text-lg">
              No necesitas inscribirte en nada. Cada vez que visitas Red
              Chairs Barber sumamos una visita a tu perfil. Al alcanzar el
              número de visitas de cada nivel, tus nuevos beneficios se
              desbloquean automáticamente para tu próxima cita.
            </p>
          </Reveal>
          <div className="space-y-4">
            {[
              { step: "01", text: "Reserva y disfruta tu servicio en Red Chairs Barber." },
              { step: "02", text: "Sumamos automáticamente la visita a tu perfil de cliente." },
              { step: "03", text: "Al llegar al umbral de visitas, subes de nivel." },
              { step: "04", text: "Disfrutas los beneficios exclusivos de tu nuevo nivel." },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 0.08}>
                <div className="flex items-center gap-6 rounded-sm border border-gold/10 bg-obsidian p-5">
                  <span className="font-display text-2xl text-gold/60">{s.step}</span>
                  <p className="text-sm text-bone/70">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-obsidian py-28 text-center">
        <div className="container-lux">
          <Reveal>
            <h2 className="heading-lg">
              Tu próxima visita <span className="text-gold">te acerca al siguiente nivel</span>
            </h2>
            <Link to="/reservar" className="btn-gold mt-10 inline-flex">
              Reservar cita
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
