import { useState, type FormEvent } from "react";
import { FaCheckCircle, FaClock, FaInstagram, FaMapMarkerAlt, FaWhatsapp } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";
import PageHero from "../components/PageHero";
import Reveal from "../components/Reveal";
import {
  ADDRESS,
  HOURS,
  INSTAGRAM_HANDLE,
  INSTAGRAM_LINK,
  PHONE_DISPLAY,
  PHONE_NUMBER,
  TIKTOK_HANDLE,
  TIKTOK_LINK,
  WHATSAPP_LINK,
} from "../data/site";

const fieldClass =
  "w-full rounded-sm border border-gold/20 bg-obsidian px-5 py-4 text-sm text-ivory placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors";

const MAP_SRC = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`;

export default function Contact() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = [
      "Hola Red Chairs Barber, tengo una consulta.",
      "",
      `Nombre: ${name || "-"}`,
      `Teléfono: ${phone || "-"}`,
      `Mensaje: ${message || "-"}`,
    ].join("\n");
    const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSent(true);
  };

  return (
    <div>
      <PageHero
        eyebrow="Estamos aquí para ti"
        title="Contacto"
        subtitle="Escríbenos, visítanos o agenda tu próxima experiencia Red Chairs."
      />

      <section className="bg-charcoal py-24">
        <div className="container-lux grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal>
            <div className="card-lux h-full text-center">
              <FaMapMarkerAlt className="mx-auto text-gold" size={24} />
              <h3 className="mt-5 font-display text-lg text-ivory">Ubicación</h3>
              <p className="mt-3 text-sm text-bone/60">{ADDRESS}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="card-lux h-full text-center">
              <FaWhatsapp className="mx-auto text-gold" size={24} />
              <h3 className="mt-5 font-display text-lg text-ivory">WhatsApp</h3>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-sm text-bone/60 transition-colors hover:text-gold"
              >
                {PHONE_DISPLAY}
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="card-lux h-full text-center">
              <FaInstagram className="mx-auto text-gold" size={24} />
              <h3 className="mt-5 font-display text-lg text-ivory">Instagram</h3>
              <a
                href={INSTAGRAM_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-sm text-bone/60 transition-colors hover:text-gold"
              >
                {INSTAGRAM_HANDLE}
              </a>
            </div>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="card-lux h-full text-center">
              <FaTiktok className="mx-auto text-gold" size={24} />
              <h3 className="mt-5 font-display text-lg text-ivory">TikTok</h3>
              <a
                href={TIKTOK_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-sm text-bone/60 transition-colors hover:text-gold"
              >
                {TIKTOK_HANDLE}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-obsidian py-24">
        <div className="container-lux grid gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="overflow-hidden rounded-sm border border-gold/15">
              <iframe
                title="Ubicación Red Chairs Barber"
                src={MAP_SRC}
                className="h-[420px] w-full grayscale invert-[92%] contrast-[0.9]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="card-lux mt-8">
              <h3 className="flex items-center gap-2 font-display text-xl text-ivory">
                <FaClock className="text-gold" /> Horarios de atención
              </h3>
              <ul className="mt-6 space-y-3">
                {HOURS.map((h) => (
                  <li
                    key={h.day}
                    className="flex items-center justify-between border-b border-white/5 pb-3 text-sm last:border-none"
                  >
                    <span className="text-ivory/80">{h.day}</span>
                    <span className="text-bone/60">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <form onSubmit={handleSubmit} className="card-lux space-y-6">
              <h3 className="font-display text-2xl text-ivory">Envíanos un mensaje</h3>
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
              <textarea
                required
                placeholder="¿En qué podemos ayudarte?"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${fieldClass} resize-none`}
              />
              <button type="submit" className="btn-gold w-full">
                Enviar mensaje
              </button>
              {sent && (
                <p className="flex items-center gap-2 text-sm text-gold">
                  <FaCheckCircle /> Te redirigimos a WhatsApp para continuar la conversación.
                </p>
              )}
            </form>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
