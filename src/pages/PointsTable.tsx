import { Link } from "react-router-dom";
import { FaCoins } from "react-icons/fa";
import PageHero from "../components/PageHero";
import SectionHeading from "../components/SectionHeading";
import Reveal from "../components/Reveal";
import {
  SERVICE_CATEGORIES,
  VIP_EXPERIENCES,
  applyLiveOverrides,
  parsePriceToNumber,
  calculatePoints,
  type Service,
} from "../data/services";
import { useServiceOverrides } from "../hooks/useServiceOverrides";

interface PointsGroup {
  id: string;
  title: string;
  subtitle: string;
  services: Service[];
}

/** Página pública: cuántos puntos RED CLUB otorga cada servicio. Reusa
 * el mismo catálogo y la misma fórmula (calculatePoints) que la vista
 * previa de /reservar, así que nunca se desincroniza de lo que el
 * trigger del servidor otorga al completar la cita
 * (award_points_on_completion(), migración 0017). */
export default function PointsTable() {
  const serviceOverrides = useServiceOverrides();

  const groups: PointsGroup[] = [
    {
      id: "vip",
      title: "Experiencias VIP",
      subtitle: "El máximo de puntos en una sola visita",
      services: applyLiveOverrides(VIP_EXPERIENCES, serviceOverrides),
    },
    ...SERVICE_CATEGORIES.map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      services: applyLiveOverrides(c.services, serviceOverrides),
    })),
  ];

  return (
    <div>
      <PageHero
        eyebrow="RED CLUB"
        title="Tabla de Puntos"
        subtitle="Cada servicio suma puntos automáticamente a tu cuenta RED CLUB en cuanto tu cita queda completada. Entre más premium la experiencia, más puntos ganas."
      />

      <section className="border-b border-gold/10 bg-obsidian py-24">
        <div className="container-lux">
          {groups.map((group, idx) => (
            <div key={group.id} className={idx > 0 ? "mt-16" : ""}>
              <SectionHeading eyebrow={group.subtitle} title={group.title} align="left" />
              <Reveal delay={0.1}>
                <div className="mt-8 overflow-x-auto rounded-sm border border-gold/15 bg-gradient-to-b from-charcoal to-obsidian shadow-card">
                  <table className="w-full min-w-[480px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-gold/20 bg-charcoal/60">
                        <th className="px-6 py-4 text-xs uppercase tracking-widest2 text-gold/80">
                          Servicio
                        </th>
                        <th className="px-6 py-4 text-right text-xs uppercase tracking-widest2 text-gold/80">
                          Precio
                        </th>
                        <th className="px-6 py-4 text-right text-xs uppercase tracking-widest2 text-gold/80">
                          Puntos RED CLUB
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.services.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-gold/10 transition-colors last:border-0 hover:bg-gold/5"
                        >
                          <td className="px-6 py-4 text-sm text-ivory/90">{s.name}</td>
                          <td className="px-6 py-4 text-right text-sm text-bone/70">{s.price}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center gap-1.5 font-display font-semibold text-gold">
                              <FaCoins size={12} /> +{calculatePoints(parsePriceToNumber(s.price))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-gold/10 bg-charcoal py-20">
        <div className="container-lux grid gap-6 sm:grid-cols-2">
          <Reveal>
            <div className="card-lux h-full">
              <p className="eyebrow justify-start before:hidden">Automático</p>
              <p className="mt-4 text-sm leading-relaxed text-bone/70">
                No necesitas canjear nada: en cuanto tu barbero marca tu cita como
                completada, los puntos quedan sumados a tu cuenta y tu nivel RED CLUB
                se actualiza solo.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="card-lux h-full">
              <p className="eyebrow justify-start before:hidden">Con cuenta RED CLUB</p>
              <p className="mt-4 text-sm leading-relaxed text-bone/70">
                Los puntos se acreditan a quienes reservan con su cuenta. Si aún no
                tienes una, es gratis y toma menos de un minuto crearla.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-obsidian py-28">
        <div className="container-lux text-center">
          <Reveal>
            <h2 className="heading-lg">
              ¿Listo para sumar tus primeros <span className="text-gold">puntos</span>?
            </h2>
            <p className="body-muted mx-auto mt-5 max-w-xl text-lg">
              Reserva tu próxima cita y empieza a acumular puntos RED CLUB desde hoy.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/reservar" className="btn-gold">
                Reservar cita
              </Link>
              <Link to="/fidelizacion" className="btn-outline">
                Ver niveles RED CLUB
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
