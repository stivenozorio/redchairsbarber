import { Link } from "react-router-dom";
import {
  FaCut,
  FaFire,
  FaHandHoldingWater,
  FaHotjar,
  FaPumpSoap,
  FaSprayCan,
  FaUserShield,
} from "react-icons/fa";
import PageHero from "../components/PageHero";
import SectionHeading from "../components/SectionHeading";
import Reveal from "../components/Reveal";
import { VIP_EXPERIENCES } from "../data/services";

const INCLUDES = [
  { icon: FaCut, title: "Corte Premium", text: "Técnicas modernas y personalizadas con el mejor estilo." },
  { icon: FaSprayCan, title: "Barba Premium", text: "Perfilado, diseño y arreglo de barba impecable." },
  { icon: FaPumpSoap, title: "Spa Facial", text: "Limpieza profunda, mascarilla de carbón activado y colágeno." },
  { icon: FaHotjar, title: "Masajes Relajantes", text: "Masaje ocular, capilar, de manos y hombros." },
  { icon: FaFire, title: "Toalla Caliente", text: "Un ritual de calor que abre los poros y relaja la piel." },
  { icon: FaHandHoldingWater, title: "Productos Premium", text: "Lo mejor para el cuidado de tu piel y cabello." },
  { icon: FaUserShield, title: "Ambiente Exclusivo", text: "Un espacio pensado solo para ti, sin prisas." },
  { icon: FaUserShield, title: "Atención Personalizada", text: "Cada detalle adaptado a lo que tú necesitas." },
];

export default function VipExperience() {
  return (
    <div>
      <PageHero
        eyebrow="Más que un corte, una experiencia completa"
        title="Experiencia VIP"
        subtitle="1:30 a 2 horas de pura experiencia para ti. Una inversión en ti mismo que se siente y se ve."
      />

      <section className="bg-charcoal py-28">
        <div className="container-lux">
          <SectionHeading
            eyebrow="Todo incluido"
            title="Un ritual completo, pensado para ti"
            subtitle="La Experiencia VIP reúne lo mejor de Red Chairs en una sola cita, para que salgas renovado por dentro y por fuera."
          />
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {INCLUDES.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.06}>
                <div className="card-lux h-full text-center">
                  <item.icon className="mx-auto text-gold" size={26} />
                  <h3 className="mt-5 font-display text-lg text-ivory">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-bone/60">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-obsidian py-28">
        <div className="container-lux">
          <SectionHeading eyebrow="Elige tu nivel" title="Menú Experiencia VIP" />
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {VIP_EXPERIENCES.map((v, i) => (
              <Reveal key={v.name} delay={i * 0.12} className={i === 1 ? "md:-translate-y-6" : ""}>
                <div
                  className={`card-lux flex h-full flex-col items-center text-center ${
                    i === 1 ? "border-gold/50 shadow-gold" : ""
                  }`}
                >
                  {i === 1 && (
                    <span className="mb-4 rounded-full border border-gold/40 px-4 py-1 text-[10px] uppercase tracking-widest2 text-gold">
                      Más elegida
                    </span>
                  )}
                  <h3 className="font-display text-2xl text-ivory">{v.name}</h3>
                  <p className="mt-4 font-display text-4xl font-bold text-gold">{v.price}</p>
                  <p className="mt-5 text-sm leading-relaxed text-bone/60">{v.description}</p>
                  <Link to="/reservar" className="btn-gold mt-8 w-full">
                    Reservar
                  </Link>
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
              Relájate. Desconéctate. <span className="text-gold">Sal mejor.</span>
            </h2>
            <p className="body-muted mx-auto mt-6 max-w-xl text-lg">
              Porque tu bienestar también importa. Pide tu Experiencia VIP y
              vive Red Chairs como se debe vivir.
            </p>
            <Link to="/reservar" className="btn-gold mt-10 inline-flex">
              Reservar Experiencia VIP
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
