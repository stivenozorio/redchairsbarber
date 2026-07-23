import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaCut,
  FaExclamationTriangle,
  FaUser,
} from "react-icons/fa";
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
  "w-full rounded-sm border border-gold/20 bg-obsidian px-5 py-4 text-sm text-ivory placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors disabled:opacity-50";

const TODAY = new Date().toISOString().split("T")[0];
const BOOKING_STORAGE_KEY = "redchairs:booking";

interface StoredBooking {
  id: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  name: string;
  phone: string;
}

interface AvailabilitySlot {
  time: string;
  available: boolean;
}

interface ApiErrorResponse {
  error: string;
}

function loadStoredBooking(): StoredBooking | null {
  try {
    const raw = localStorage.getItem(BOOKING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredBooking) : null;
  } catch {
    return null;
  }
}

function saveStoredBooking(booking: StoredBooking) {
  localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(booking));
}

function clearStoredBooking() {
  localStorage.removeItem(BOOKING_STORAGE_KEY);
}

/** Fetches real-time slot availability for a date. Returns null (instead of
 * throwing) on any network/config failure so the UI can degrade gracefully
 * to "let the team confirm by WhatsApp" instead of blocking the form. */
async function fetchAvailability(date: string): Promise<AvailabilitySlot[] | null> {
  try {
    const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { slots: AvailabilitySlot[] };
    return data.slots;
  } catch {
    return null;
  }
}

function toAvailabilityMap(slots: AvailabilitySlot[] | null): Record<string, boolean> | null {
  return slots ? Object.fromEntries(slots.map((s) => [s.time, s.available])) : null;
}

export default function Booking() {
  const [service, setService] = useState("");
  const [barber, setBarber] = useState(BARBERS[0].name);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [availability, setAvailability] = useState<Record<string, boolean> | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const latestRequestedDate = useRef<string | null>(null);

  const [myBooking, setMyBooking] = useState<StoredBooking | null>(() => loadStoredBooking());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleAvailability, setRescheduleAvailability] = useState<Record<string, boolean> | null>(
    null
  );
  const [rescheduleChecking, setRescheduleChecking] = useState(false);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) {
      setAvailability(null);
      return;
    }
    latestRequestedDate.current = date;
    setCheckingAvailability(true);
    fetchAvailability(date).then((slots) => {
      if (latestRequestedDate.current !== date) return;
      const map = toAvailabilityMap(slots);
      setAvailability(map);
      setCheckingAvailability(false);
      setTime((current) => (current && map && map[current] === false ? "" : current));
    });
  }, [date]);

  useEffect(() => {
    if (!rescheduleOpen || !rescheduleDate) return;
    let active = true;
    setRescheduleChecking(true);
    fetchAvailability(rescheduleDate).then((slots) => {
      if (!active) return;
      setRescheduleAvailability(toAvailabilityMap(slots));
      setRescheduleChecking(false);
    });
    return () => {
      active = false;
    };
  }, [rescheduleOpen, rescheduleDate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, barber, date, time, name, phone }),
      });

      if (res.status === 409) {
        const data = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        setFormError(data?.error ?? "Ese horario ya no está disponible. Elige otro.");
        latestRequestedDate.current = date;
        fetchAvailability(date).then((slots) => {
          if (latestRequestedDate.current !== date) return;
          setAvailability(toAvailabilityMap(slots));
        });
        setSubmitting(false);
        return;
      }

      if (res.ok) {
        const data = (await res.json()) as { id: string };
        const booking: StoredBooking = { id: data.id, service, barber, date, time, name, phone };
        saveStoredBooking(booking);
        setMyBooking(booking);
      }
      // If the calendar call itself failed (e.g. Google not configured yet),
      // we still fall through to the WhatsApp handoff below so reservations
      // keep working exactly as before.
    } catch {
      // Network error — fall through to the WhatsApp fallback.
    }

    setSubmitting(false);

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

  const handleCancel = async () => {
    if (!myBooking) return;
    if (!window.confirm("¿Seguro que quieres cancelar tu reserva?")) return;

    setCancelling(true);
    setActionError(null);
    try {
      const res = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: myBooking.id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        setActionError(data?.error ?? "No pudimos cancelar tu reserva. Intenta de nuevo.");
        return;
      }
      clearStoredBooking();
      setMyBooking(null);
      setRescheduleOpen(false);
      setActionMessage("Tu reserva fue cancelada.");
    } catch {
      setActionError("No pudimos cancelar tu reserva. Verifica tu conexión.");
    } finally {
      setCancelling(false);
    }
  };

  const openReschedule = () => {
    if (!myBooking) return;
    setActionMessage(null);
    setActionError(null);
    setRescheduleError(null);
    setRescheduleDate(myBooking.date);
    setRescheduleTime("");
    setRescheduleOpen(true);
  };

  const handleReschedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!myBooking) return;

    setRescheduleSubmitting(true);
    setRescheduleError(null);
    try {
      const res = await fetch("/api/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: myBooking.id, date: rescheduleDate, time: rescheduleTime }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        setRescheduleError(data?.error ?? "No pudimos reprogramar tu reserva.");
        return;
      }

      const updated: StoredBooking = { ...myBooking, date: rescheduleDate, time: rescheduleTime };
      saveStoredBooking(updated);
      setMyBooking(updated);
      setRescheduleOpen(false);
      setActionMessage("Tu reserva fue reprogramada.");
    } catch {
      setRescheduleError("No pudimos reprogramar tu reserva. Verifica tu conexión.");
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  return (
    <div>
      <PageHero
        eyebrow="Agenda tu cita"
        title="Reservar Cita"
        subtitle="Selecciona tu servicio, tu barbero de confianza, y el día y hora que mejor te convenga."
      />

      <section className="bg-charcoal py-24">
        <div className="container-lux">
          {myBooking && (
            <Reveal>
              <div className="card-lux mb-10">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <p className="eyebrow justify-start before:hidden">Tu reserva</p>
                    <h3 className="mt-3 font-display text-xl text-ivory">{myBooking.service}</h3>
                    <p className="mt-2 text-sm text-bone/70">
                      {myBooking.barber} · {myBooking.date} · {myBooking.time}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={openReschedule}
                      className="btn-outline !px-5 !py-3 text-[11px]"
                    >
                      Reprogramar
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="btn-outline !border-blood/50 !px-5 !py-3 text-[11px] !text-blood hover:!bg-blood/10 disabled:opacity-50"
                    >
                      {cancelling ? "Cancelando..." : "Cancelar reserva"}
                    </button>
                  </div>
                </div>

                {actionMessage && (
                  <p className="mt-5 flex items-center gap-2 text-sm text-gold">
                    <FaCheckCircle /> {actionMessage}
                  </p>
                )}
                {actionError && (
                  <p className="mt-5 flex items-center gap-2 text-sm text-blood">
                    <FaExclamationTriangle /> {actionError}
                  </p>
                )}

                {rescheduleOpen && (
                  <form
                    onSubmit={handleReschedule}
                    className="mt-8 grid grid-cols-1 gap-4 border-t border-gold/10 pt-8 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest2 text-gold/80">
                        <FaCalendarAlt /> Nueva fecha
                      </label>
                      <input
                        required
                        type="date"
                        value={rescheduleDate}
                        min={TODAY}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest2 text-gold/80">
                        <FaClock /> Nueva hora
                      </label>
                      <select
                        required
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        disabled={rescheduleChecking}
                        className={fieldClass}
                      >
                        <option value="" disabled>
                          {rescheduleChecking ? "Consultando..." : "Selecciona"}
                        </option>
                        {TIME_SLOTS.map((t) => (
                          <option
                            key={t}
                            value={t}
                            disabled={rescheduleAvailability ? rescheduleAvailability[t] === false : false}
                          >
                            {t}
                            {rescheduleAvailability && rescheduleAvailability[t] === false ? " (ocupado)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={rescheduleSubmitting}
                        className="btn-gold w-full !py-4 disabled:opacity-50"
                      >
                        {rescheduleSubmitting ? "Guardando..." : "Confirmar"}
                      </button>
                    </div>
                    {rescheduleError && (
                      <p className="flex items-center gap-2 text-sm text-blood sm:col-span-3">
                        <FaExclamationTriangle /> {rescheduleError}
                      </p>
                    )}
                  </form>
                )}
              </div>
            </Reveal>
          )}

          <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr]">
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
                      min={TODAY}
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
                      disabled={checkingAvailability}
                      className={fieldClass}
                    >
                      <option value="" disabled>
                        {checkingAvailability ? "Consultando..." : "Selecciona"}
                      </option>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t} disabled={availability ? availability[t] === false : false}>
                          {t}
                          {availability && availability[t] === false ? " (ocupado)" : ""}
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

                <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-50">
                  {submitting ? "Reservando..." : "Reservar por WhatsApp"}
                </button>

                {formError && (
                  <p className="flex items-center gap-2 text-sm text-blood">
                    <FaExclamationTriangle /> {formError}
                  </p>
                )}

                {sent && (
                  <p className="flex items-center gap-2 text-sm text-gold">
                    <FaCheckCircle /> Te redirigimos a WhatsApp para confirmar tu cita.
                  </p>
                )}

                <p className="text-center text-xs text-bone/40">
                  Tu horario se verifica en tiempo real contra nuestro calendario y tu
                  solicitud también se confirma por WhatsApp con nuestro equipo.
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
        </div>
      </section>
    </div>
  );
}
