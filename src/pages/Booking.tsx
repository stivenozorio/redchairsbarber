import { useState, type FormEvent } from "react";
import { FaCalendarAlt, FaCheckCircle, FaClock, FaCut, FaUser } from "react-icons/fa";
import PageHero from "../components/PageHero";
import Reveal from "../components/Reveal";
import { SERVICE_CATEGORIES, VIP_EXPERIENCES } from "../data/services";
import { BARBERS, TIME_SLOTS } from "../data/booking";
import { PHONE_NUMBER } from "../data/site";

const ALL_SERVICES = [
  ...VIP_EXPERIENCES.map((v) => `${v.name} — ${v.price}`),
  ...SERVICE_CATEGORIES.flatMap((c) => c.services.map((s) => `${s.name} — ${s.price}`)),
];

const fieldClass =
  "w-full rounded-sm border border-gold/20 bg-obsidian px-5 py-4 text-sm text-ivory placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors";

export default function Booking() {
  const [service, setService] = useState("");
  const [barber, setBarber] = useState(BARBERS[0].name);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const lines = [
      "Hola Red Chairs Barber, quiero reservar una cita.",
      "",
      `Servicio: ${service || "Por definir"}`,
      `Barbero: ${barber}`,
      `Fecha: ${date || "Por definir"}`,
      `Hora: ${time || "Por definir"}`,
      `Nombre: ${name || "-"}`,
      `Teléfono: ${phone || "-"}`,
    ];
    const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSent(true);
  };

  return (
    <div>
      <PageHero
        eyebrow="Agenda tu cita"
        title="Reservar Cita"
        subtitle="Selecciona tu servicio, tu barbero de confianza, y el día y hora que mejor te convenga."
      />

      <section className="bg-charcoal py-24">
        <div className="container-lux grid gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <form onSubmit={handleSubmit} className="card-lux space-y-6">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest2 text-gold/80">
                  <FaCut /> Servicio
                </label>
                <select
                  required
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className={fieldClass}
                >
                  <option value="" disabled>
                    Selecciona un servicio
                  </option>
                  {ALL_SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest2 text-gold/80">
                  <FaUser /> Barbero
                </label>
                <select
                  value={barber}
                  onChange={(e) => setBarber(e.target.value)}
                  className={fieldClass}
                >
                  {BARBERS.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest2 text-gold/80">
                    <FaCalendarAlt /> Fecha
                  </label>
                  <input
                    required
                    type="date"
                    value={date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setDate(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest2 text-gold/80">
                    <FaClock /> Hora
                  </label>
                  <select
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="" disabled>
                      Selecciona
                    </option>
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  required
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={fieldClass}
                />
                <input
                  required
                  type="tel"
                  placeholder="Tu teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <button type="submit" className="btn-gold w-full">
                Reservar por WhatsApp
              </button>

              {sent && (
                <p className="flex items-center gap-2 text-sm text-gold">
                  <FaCheckCircle /> Te redirigimos a WhatsApp para confirmar tu cita.
                </p>
              )}

              <p className="text-center text-xs text-bone/40">
                Tu solicitud se confirma directamente por WhatsApp con nuestro
                equipo. Próximamente podrás reservar y pagar en línea sin salir
                del sitio.
              </p>
            </form>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="card-lux h-full">
              <h3 className="font-display text-2xl text-ivory">¿Cómo funciona?</h3>
              <ol className="mt-8 space-y-6">
                {[
                  "Elige el servicio o experiencia que quieres vivir.",
                  "Selecciona tu barbero de confianza o déjalo a nuestra elección.",
                  "Escoge la fecha y hora que mejor se ajuste a tu agenda.",
                  "Confirma tu reserva por WhatsApp y listo.",
                ].map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="font-display text-2xl text-gold/50">
                      0{i + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-bone/70">{step}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-10 border-t border-gold/10 pt-8">
                <p className="text-sm text-bone/60">
                  ¿Prefieres hablar directamente con nosotros?
                </p>
                <a
                  href={`https://wa.me/${PHONE_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline mt-5 inline-flex"
                >
                  Escríbenos por WhatsApp
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
