import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaTimes, FaWhatsapp } from "react-icons/fa";
import { ADDRESS, HOURS, WHATSAPP_LINK } from "../data/site";
import { SERVICE_CATEGORIES, VIP_EXPERIENCES, parsePriceToNumber } from "../data/services";
import { formatCop } from "../lib/format";

const SCROLL_THRESHOLD = 400;

const CATEGORY_FROM_PRICE = SERVICE_CATEGORIES.map((c) => ({
  title: c.title,
  from: Math.min(...c.services.map((s) => parsePriceToNumber(s.price))),
}));
const VIP_FROM_PRICE = Math.min(...VIP_EXPERIENCES.map((s) => parsePriceToNumber(s.price)));

interface Topic {
  id: string;
  label: string;
  answer: ReactNode;
}

/** Respuestas fijas, armadas con los mismos datos que ya usa el resto del
 * sitio (services.ts, site.ts) — no es un modelo de lenguaje, es una guía
 * de preguntas frecuentes con formato de chat. Para cualquier otra cosa,
 * el botón de WhatsApp queda siempre visible al fondo del panel. */
const TOPICS: Topic[] = [
  {
    id: "horarios",
    label: "Horarios",
    answer: (
      <div>
        {HOURS.map((h) => (
          <p key={h.day}>
            {h.day}: {h.time}
          </p>
        ))}
        <p className="mt-1 text-bone/60">Los domingos permanecemos cerrados.</p>
      </div>
    ),
  },
  {
    id: "servicios",
    label: "Servicios y precios",
    answer: (
      <div>
        <p>Precios desde, por categoría:</p>
        <ul className="mt-2 space-y-1">
          {CATEGORY_FROM_PRICE.map((c) => (
            <li key={c.title}>
              {c.title}: desde {formatCop(c.from)}
            </li>
          ))}
          <li>Experiencias VIP: desde {formatCop(VIP_FROM_PRICE)}</li>
        </ul>
        <Link to="/servicios" className="mt-2 inline-block text-gold underline">
          Ver el detalle completo
        </Link>
      </div>
    ),
  },
  {
    id: "ubicacion",
    label: "Ubicación",
    answer: (
      <div>
        <p>Estamos en {ADDRESS}.</p>
        <a
          href={`https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-gold underline"
        >
          Abrir en Google Maps
        </a>
      </div>
    ),
  },
  {
    id: "reservar",
    label: "Reservar cita",
    answer: (
      <div>
        <p>Puedes reservar en línea eligiendo barbero, servicio y horario disponible.</p>
        <Link to="/reservar" className="mt-2 inline-block text-gold underline">
          Ir a reservar
        </Link>
      </div>
    ),
  },
  {
    id: "puntos",
    label: "Productos y puntos",
    answer: (
      <div>
        <p>Con RED CLUB acumulas puntos en cada visita y los puedes canjear por productos o servicios.</p>
        <div className="mt-2 flex flex-col gap-1">
          <Link to="/fidelizacion" className="text-gold underline">
            Cómo funciona RED CLUB
          </Link>
          <Link to="/productos" className="text-gold underline">
            Ver productos
          </Link>
        </div>
      </div>
    ),
  },
];

interface Message {
  id: string;
  from: "bot" | "user";
  content: ReactNode;
}

const GREETING: Message = {
  id: "greeting",
  from: "bot",
  content: <p>Hola, soy el asistente de Red Chairs Barber. Elige una pregunta abajo, o escríbenos directo por WhatsApp.</p>,
};

/**
 * Botón flotante "RCB" — reemplaza al botón de WhatsApp fijo que había
 * antes (ver git log). Aparece solo después de scrollear (SCROLL_THRESHOLD),
 * no desde el primer instante, para no competir con el hero.
 *
 * Al abrirlo muestra un chat de preguntas frecuentes fijas (no es IA real:
 * ver el comentario de TOPICS arriba) con un botón de WhatsApp siempre
 * visible al fondo, para cualquier pregunta que no esté en la lista.
 */
export default function ChatAssistant({ hidden = false }: { hidden?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleToggle = () => {
    if (!open && messages.length === 0) setMessages([GREETING]);
    setOpen((prev) => !prev);
  };

  const handleTopic = (topic: Topic) => {
    setMessages((prev) => [
      ...prev,
      { id: `${topic.id}-q-${prev.length}`, from: "user", content: topic.label },
      { id: `${topic.id}-a-${prev.length}`, from: "bot", content: topic.answer },
    ]);
  };

  if (hidden) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && visible && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="flex max-h-[70svh] w-[min(92vw,360px)] flex-col overflow-hidden rounded-sm border border-gold/20 bg-obsidian shadow-card"
          >
            <div className="flex items-center justify-between border-b border-gold/10 bg-charcoal px-4 py-3">
              <div>
                <p className="font-display text-sm text-ivory">Asistente Red Chairs</p>
                <p className="text-[11px] uppercase tracking-widest2 text-bone/50">Preguntas rápidas</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar asistente"
                className="shrink-0 text-bone/50 transition-colors hover:text-gold"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m) => (
                <div key={m.id} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
                      m.from === "user" ? "bg-gold text-obsidian" : "bg-charcoal text-bone/80"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gold/10 px-4 py-3">
              <p className="mb-2 text-[10px] uppercase tracking-widest2 text-bone/40">Preguntar sobre</p>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleTopic(topic)}
                    className="rounded-full border border-gold/20 px-3 py-1.5 text-xs text-bone/70 transition-colors hover:border-gold/50 hover:text-gold"
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold mt-3 flex w-full items-center justify-center gap-2 !py-2.5 text-xs"
              >
                <FaWhatsapp size={14} /> Escríbenos por WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25 }}
            onClick={handleToggle}
            aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gold font-display text-sm font-bold tracking-wide text-obsidian shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-110"
          >
            {open ? <FaTimes size={20} /> : "RCB"}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
