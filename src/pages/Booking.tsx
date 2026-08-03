import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaCut,
  FaExclamationTriangle,
  FaSpinner,
  FaUser,
} from "react-icons/fa";
import PageHero from "../components/PageHero";
import Reveal from "../components/Reveal";
import {
  SERVICE_CATEGORIES,
  VIP_EXPERIENCES,
  ALL_BOOKABLE_SERVICES,
  sumServiceTotals,
  formatPriceNumber,
  applyLiveOverrides,
} from "../data/services";
import { BARBERS, TIME_SLOTS } from "../data/booking";
import { PHONE_NUMBER } from "../data/site";
import { useAuth } from "../auth/useAuth";
import { useServiceOverrides } from "../hooks/useServiceOverrides";

const fieldClass =
  "w-full rounded-sm border border-gold/20 bg-obsidian px-5 py-4 text-sm text-ivory placeholder:text-bone/40 focus:border-gold focus:outline-none transition-colors disabled:opacity-50";

const TODAY = new Date().toISOString().split("T")[0];
const BOOKING_STORAGE_KEY = "redchairs:booking";

interface StoredBooking {
  id: string;
  /** Ids de servicio: se usan para volver a consultar disponibilidad al
   * reprogramar (el id no cambia si el servicio se renombra después). */
  serviceIds: string[];
  /** Nombres tal como se llamaban al momento de reservar — un snapshot
   * para mostrar, igual que booking_services.name_snapshot en la base:
   * no debe cambiar aunque el servicio se renombre más tarde. */
  serviceNames: string[];
  barberId: string;
  barberName: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  notes: string;
  totalPrice: number;
}

interface AvailabilitySlot {
  time: string;
  available: boolean;
}

interface ApiErrorResponse {
  error: string;
  missingEnvVars?: string[];
}

function describeApiError(data: ApiErrorResponse | null, fallback: string): string {
  if (!data) return fallback;
  if (data.missingEnvVars && data.missingEnvVars.length > 0) {
    return `${data.error} (faltan estas variables de entorno: ${data.missingEnvVars.join(", ")})`;
  }
  return data.error ?? fallback;
}

interface BookResponse {
  id: string;
  assignedBarberId: string;
  assignedBarberName: string;
  totalPrice: number;
}

function loadStoredBooking(): StoredBooking | null {
  try {
    const raw = localStorage.getItem(BOOKING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredBooking>;
    // Formato anterior (antes de separar ids/nombres): no se puede migrar
    // con certeza, así que se descarta en vez de arriesgar un crash.
    if (!Array.isArray(parsed.serviceIds) || !Array.isArray(parsed.serviceNames)) {
      localStorage.removeItem(BOOKING_STORAGE_KEY);
      return null;
    }
    return parsed as StoredBooking;
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

/** Fetches real-time slot availability for a date + barber + service
 * combination. Returns null (instead of throwing) on any network/config
 * failure so the UI can degrade instead of crashing. */
async function fetchAvailability(
  date: string,
  barberId: string,
  serviceIds: string[]
): Promise<AvailabilitySlot[] | null> {
  try {
    const query = new URLSearchParams({ date, barberId }).toString();
    const servicesParam = serviceIds.map(encodeURIComponent).join(",");
    const res = await fetch(`/api/availability?${query}&services=${servicesParam}`);
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
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [barberId, setBarberId] = useState(BARBERS[0].id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const { session, profile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successPending, setSuccessPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  // Precio/duración vivos desde el panel administrativo, superpuestos al
  // catálogo estático (que sigue dando nombres, categorías y
  // descripciones). Sin esto, un cambio de precio o duración en
  // /admin/servicios solo se vería reflejado al confirmar la cita, no
  // mientras el cliente todavía la está armando.
  const serviceOverrides = useServiceOverrides();
  const liveServiceCatalog = useMemo(
    () => applyLiveOverrides(ALL_BOOKABLE_SERVICES, serviceOverrides),
    [serviceOverrides]
  );
  const SERVICE_GROUPS = useMemo(
    () => [
      ...SERVICE_CATEGORIES.map((c) => ({
        title: c.title,
        services: applyLiveOverrides(c.services, serviceOverrides),
      })),
      { title: "Experiencias VIP", services: applyLiveOverrides(VIP_EXPERIENCES, serviceOverrides) },
    ],
    [serviceOverrides]
  );

  const { totalMinutes, totalPrice } = useMemo(
    () => sumServiceTotals(selectedServices, liveServiceCatalog),
    [selectedServices, liveServiceCatalog]
  );

  const [availability, setAvailability] = useState<Record<string, boolean> | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const latestRequestKey = useRef<string | null>(null);

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

  const toggleService = (serviceId: string) => {
    setSelectedServices((current) =>
      current.includes(serviceId) ? current.filter((s) => s !== serviceId) : [...current, serviceId]
    );
  };

  // Pre-llena los datos del socio de RED CLUB, sin pisar lo que ya haya
  // escrito manualmente.
  useEffect(() => {
    if (!profile) return;
    if (profile.full_name) setName((current) => current || profile.full_name || "");
    if (profile.phone) setPhone((current) => current || profile.phone || "");
  }, [profile]);

  useEffect(() => {
    if (!date || !barberId || selectedServices.length === 0) {
      setAvailability(null);
      return;
    }
    const key = `${date}|${barberId}|${selectedServices.join(",")}`;
    latestRequestKey.current = key;
    setCheckingAvailability(true);
    fetchAvailability(date, barberId, selectedServices).then((slots) => {
      if (latestRequestKey.current !== key) return;
      const map = toAvailabilityMap(slots);
      setAvailability(map);
      setCheckingAvailability(false);
      setTime((current) => (current && map && map[current] === false ? "" : current));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, barberId, selectedServices.join(",")]);

  useEffect(() => {
    if (!rescheduleOpen || !rescheduleDate || !myBooking) return;
    let active = true;
    setRescheduleChecking(true);
    fetchAvailability(rescheduleDate, myBooking.barberId, myBooking.serviceIds).then((slots) => {
      if (!active) return;
      setRescheduleAvailability(toAvailabilityMap(slots));
      setRescheduleChecking(false);
    });
    return () => {
      active = false;
    };
  }, [rescheduleOpen, rescheduleDate, myBooking]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (selectedServices.length === 0) {
      setFormError("Selecciona al menos un servicio.");
      return;
    }

    setSubmitting(true);

    // Safari (y otros navegadores móviles) solo permite abrir una pestaña
    // nueva como reacción DIRECTA e inmediata al gesto del usuario (este
    // submit). Si window.open se llama después de un await (la llamada a
    // /api/book) o un setTimeout, lo bloquean en silencio — sin ningún
    // error visible, la pestaña simplemente nunca aparece. Por eso se abre
    // en blanco aquí mismo, todavía dentro del gesto, y más abajo solo se
    // le asigna la URL una vez que ya tenemos los datos de la reserva.
    //
    // OJO: no se le puede pasar "noopener" aquí — por especificación,
    // window.open devuelve null cuando se incluye esa feature, y sin la
    // referencia no hay forma de navegarla después. En su lugar se anula
    // whatsappTab.opener manualmente abajo, que logra el mismo efecto de
    // seguridad (la pestaña de WhatsApp no puede tocar esta ventana) sin
    // perder la referencia que sí necesitamos conservar.
    const whatsappTab = window.open("", "_blank");
    if (whatsappTab) {
      whatsappTab.opener = null;
    }

    let result: BookResponse;
    try {
      // Si hay sesión, el token permite al servidor vincular la reserva
      // a la cuenta del cliente. Sin sesión se reserva como invitado,
      // exactamente como antes.
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/book", {
        method: "POST",
        headers,
        body: JSON.stringify({ services: selectedServices, barberId, date, time, name, phone, notes }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        setFormError(describeApiError(data, "No fue posible crear tu reserva. Intenta de nuevo."));
        if (res.status === 409) {
          fetchAvailability(date, barberId, selectedServices).then((slots) => {
            setAvailability(toAvailabilityMap(slots));
          });
        }
        whatsappTab?.close();
        setSubmitting(false);
        return;
      }

      result = (await res.json()) as BookResponse;
    } catch {
      setFormError("No fue posible crear tu reserva. Verifica tu conexión e intenta de nuevo.");
      whatsappTab?.close();
      setSubmitting(false);
      return;
    }

    const booking: StoredBooking = {
      id: result.id,
      serviceIds: selectedServices,
      serviceNames: sumServiceTotals(selectedServices, liveServiceCatalog).services.map((s) => s.name),
      barberId: result.assignedBarberId,
      barberName: result.assignedBarberName,
      date,
      time,
      name,
      phone,
      notes,
      totalPrice: result.totalPrice,
    };
    saveStoredBooking(booking);
    setMyBooking(booking);
    setSubmitting(false);
    setSuccessPending(true);

    window.setTimeout(() => {
      const lines = [
        "Hola Red Chairs Barber, quiero confirmar mi cita.",
        "",
        `Barbero: ${result.assignedBarberName}`,
        "Servicios:",
        ...sumServiceTotals(selectedServices, liveServiceCatalog).services.map(
          (s) => `- ${s.name} (${s.price})`
        ),
        `Valor total: ${formatPriceNumber(result.totalPrice)}`,
        `Fecha: ${date}`,
        `Hora: ${time}`,
        `Nombre: ${name}`,
        `Teléfono: ${phone}`,
        notes.trim() ? `Observaciones: ${notes.trim()}` : null,
      ].filter((line): line is string => Boolean(line));
      const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
      // Si el navegador bloqueó igual la pestaña en blanco (whatsappTab
      // null o cerrada), se intenta una vez más directo — y de cualquier
      // forma queda el enlace visible de abajo como respaldo manual.
      if (whatsappTab && !whatsappTab.closed) {
        whatsappTab.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      setWhatsappUrl(url);
      setSuccessPending(false);
      setSent(true);
    }, 2000);
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
        body: JSON.stringify({ eventId: myBooking.id, barberId: myBooking.barberId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        setActionError(describeApiError(data, "No pudimos cancelar tu reserva. Intenta de nuevo."));
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
        body: JSON.stringify({
          eventId: myBooking.id,
          barberId: myBooking.barberId,
          date: rescheduleDate,
          time: rescheduleTime,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiErrorResponse | null;
        setRescheduleError(describeApiError(data, "No pudimos reprogramar tu reserva."));
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
        subtitle="Selecciona tus servicios, tu barbero de confianza, y el día y hora que mejor te convenga."
      />

      <section className="bg-charcoal py-24">
        <div className="container-lux">
          {myBooking && (
            <Reveal>
              <div className="card-lux mb-10">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <p className="eyebrow justify-start before:hidden">Tu reserva</p>
                    <h3 className="mt-3 font-display text-xl text-ivory">
                      {myBooking.serviceNames.join(" + ")}
                    </h3>
                    <p className="mt-2 text-sm text-bone/70">
                      {myBooking.barberName} · {myBooking.date} · {myBooking.time} ·{" "}
                      {formatPriceNumber(myBooking.totalPrice)}
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
                    <FaCut /> Servicios
                  </label>
                  <div className="max-h-72 space-y-5 overflow-y-auto rounded-sm border border-gold/20 bg-obsidian p-5">
                    {SERVICE_GROUPS.map((group) => (
                      <div key={group.title}>
                        <p className="mb-2 text-[11px] uppercase tracking-widest2 text-gold/70">
                          {group.title}
                        </p>
                        <div className="space-y-1">
                          {group.services.map((s) => (
                            <label
                              key={s.id}
                              className="flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-sm text-ivory/90 transition-colors hover:bg-white/5"
                            >
                              <span className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedServices.includes(s.id)}
                                  onChange={() => toggleService(s.id)}
                                  className="h-4 w-4 accent-gold"
                                />
                                {s.name}
                              </span>
                              <span className="shrink-0 text-gold/80">{s.price}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-bone/60">
                    {selectedServices.length > 0 ? (
                      <>
                        {selectedServices.length} servicio{selectedServices.length > 1 ? "s" : ""}{" "}
                        seleccionado{selectedServices.length > 1 ? "s" : ""} · Duración estimada:{" "}
                        {totalMinutes} min · Total:{" "}
                        <span className="font-semibold text-gold">{formatPriceNumber(totalPrice)}</span>
                      </>
                    ) : (
                      "Selecciona al menos un servicio."
                    )}
                  </p>
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest2 text-gold/80">
                    <FaUser /> Barbero
                  </label>
                  <select
                    value={barberId}
                    onChange={(e) => setBarberId(e.target.value)}
                    className={fieldClass}
                  >
                    {BARBERS.map((b) => (
                      <option key={b.id} value={b.id}>
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
                      disabled={checkingAvailability || selectedServices.length === 0}
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

                <textarea
                  placeholder="Observaciones (opcional)"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${fieldClass} resize-none`}
                />

                <button
                  type="submit"
                  disabled={submitting || successPending}
                  className="btn-gold flex w-full items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting && (
                    <>
                      <FaSpinner className="animate-spin" /> Creando tu reserva...
                    </>
                  )}
                  {!submitting && successPending && "Redirigiendo a WhatsApp..."}
                  {!submitting && !successPending && "Reservar por WhatsApp"}
                </button>

                {formError && (
                  <p className="flex items-center gap-2 text-sm text-blood">
                    <FaExclamationTriangle /> {formError}
                  </p>
                )}

                {successPending && (
                  <div className="rounded-sm border border-gold/30 bg-gold/10 p-4 text-center">
                    <p className="flex items-center justify-center gap-2 text-sm font-semibold text-gold">
                      <FaCheckCircle /> ¡Tu cita fue reservada exitosamente!
                    </p>
                    <p className="mt-2 text-xs text-bone/70">
                      En unos segundos serás redirigido a WhatsApp para confirmar tu reserva.
                    </p>
                  </div>
                )}

                {sent && !successPending && (
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-sm text-gold">
                      <FaCheckCircle /> Te redirigimos a WhatsApp para confirmar tu cita.
                    </p>
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline flex w-full items-center justify-center gap-2"
                      >
                        ¿No se abrió? Toca aquí para ir a WhatsApp
                      </a>
                    )}
                  </div>
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
                    "Elige uno o varios servicios que quieras vivir.",
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
