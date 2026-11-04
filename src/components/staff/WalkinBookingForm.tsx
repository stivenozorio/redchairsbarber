import { useMemo, useState } from "react";
import {
  FaCalendarCheck,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSearch,
  FaSpinner,
  FaUserPlus,
} from "react-icons/fa";
import { TIME_SLOTS } from "../../data/booking";
import { ALL_BOOKABLE_SERVICES, applyLiveOverrides, sumServiceTotals } from "../../data/services";
import { useServiceOverrides } from "../../hooks/useServiceOverrides";
import { useWalkinBooking, type WalkinClient } from "../../hooks/useWalkinBooking";
import { fieldClass, labelClass } from "../../lib/ui";
import { formatCop } from "../../lib/format";

/**
 * Reserva real para un cliente que se acercó en persona y no quiere (o
 * no puede) registrarse solo — ej. alguien mayor que prefiere que el
 * barbero le haga la cita. A diferencia de BlockSlotForm (que solo
 * bloquea el horario), esto crea una reserva de verdad con servicios:
 * cuenta para puntos y nivel igual que una reserva en línea. Ver
 * api/staff/walkin.ts.
 */
export default function WalkinBookingForm({
  barberId,
  date,
  onBooked,
}: {
  /** El barbero específico para el que se reserva. null cuando un admin
   * todavía no eligió uno puntual (viendo "Todos"): el formulario se
   * deshabilita, igual que BlockSlotForm. */
  barberId: string | null;
  date: string;
  onBooked: () => void;
}) {
  const { findOrCreateClient, bookForClient, finding, booking } = useWalkinBooking();
  const serviceOverrides = useServiceOverrides();
  const liveCatalog = useMemo(
    () => applyLiveOverrides(ALL_BOOKABLE_SERVICES, serviceOverrides),
    [serviceOverrides]
  );

  const [phone, setPhone] = useState("");
  const [client, setClient] = useState<WalkinClient | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [time, setTime] = useState(TIME_SLOTS.includes("10:00 am") ? "10:00 am" : TIME_SLOTS[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { totalMinutes, totalPrice } = sumServiceTotals(selectedServices, liveCatalog);

  const resetAll = () => {
    setPhone("");
    setClient(null);
    setNeedsName(false);
    setFullName("");
    setSelectedServices([]);
    setNotes("");
  };

  const handleSearch = async () => {
    setError(null);
    setSuccess(false);
    const trimmed = phone.trim();
    if (!trimmed) {
      setError("Escribe el teléfono del cliente.");
      return;
    }
    const result = await findOrCreateClient(trimmed);
    if (!result.ok) {
      if (result.needsName) {
        setNeedsName(true);
        return;
      }
      setError(result.error);
      return;
    }
    setClient(result.client);
    setNeedsName(false);
  };

  const handleCreateClient = async () => {
    setError(null);
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Escribe el nombre del cliente.");
      return;
    }
    const result = await findOrCreateClient(phone.trim(), trimmedName);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setClient(result.client);
    setNeedsName(false);
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (!barberId || !client) return;
    setError(null);
    setSuccess(false);
    if (selectedServices.length === 0) {
      setError("Selecciona al menos un servicio.");
      return;
    }
    const result = await bookForClient({
      clientUserId: client.id,
      barberId,
      date,
      time,
      services: selectedServices,
      notes: notes.trim() || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    resetAll();
    onBooked();
  };

  return (
    <div className="card-lux">
      <p className="eyebrow justify-start before:hidden">Reservar para cliente presencial</p>
      <p className="mt-3 text-xs text-bone/50">
        Para quien prefiere que tú le hagas la cita — queda a su nombre y sí le suma puntos y
        visitas de RED CLUB, a diferencia de un bloqueo de horario.
      </p>

      {!barberId ? (
        <p className="mt-4 text-sm text-bone/60">Elige un barbero específico arriba para poder reservar.</p>
      ) : !client ? (
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Teléfono del cliente</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setNeedsName(false);
                }}
                placeholder="300 123 4567"
                className={fieldClass}
              />
              <button
                type="button"
                disabled={finding}
                onClick={() => void handleSearch()}
                className="btn-outline shrink-0 !px-4 disabled:opacity-50"
              >
                {finding ? <FaSpinner className="animate-spin" /> : <FaSearch size={12} />}
              </button>
            </div>
          </div>

          {needsName && (
            <div>
              <label className={labelClass}>Nombre completo (cliente nuevo)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre y apellido"
                  className={fieldClass}
                />
                <button
                  type="button"
                  disabled={finding}
                  onClick={() => void handleCreateClient()}
                  className="btn-outline shrink-0 !px-4 disabled:opacity-50"
                >
                  {finding ? <FaSpinner className="animate-spin" /> : <FaUserPlus size={12} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-bone/50">No existe ningún cliente con ese teléfono todavía.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-sm border border-gold/20 px-4 py-3">
            <div>
              <p className="font-display text-base text-ivory">{client.full_name}</p>
              <p className="text-xs text-bone/50">{client.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => setClient(null)}
              className="text-xs uppercase tracking-widest2 text-gold/70 underline transition-colors hover:text-gold"
            >
              Cambiar
            </button>
          </div>

          <div>
            <label className={labelClass}>Servicios</label>
            <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {liveCatalog.map((service) => (
                <label
                  key={service.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-bone/80"
                >
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                    className="accent-gold"
                  />
                  <span className="truncate">
                    {service.name} <span className="text-bone/40">· {service.price}</span>
                  </span>
                </label>
              ))}
            </div>
            {selectedServices.length > 0 && (
              <p className="mt-2 text-xs text-gold/80">
                {totalMinutes} min · {formatCop(totalPrice)}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Hora</label>
              <select value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass}>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Nota (opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Prefiere tijera"
                className={fieldClass}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={booking}
            onClick={() => void handleSubmit()}
            className="btn-gold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {booking ? <FaSpinner className="animate-spin" /> : <FaCalendarCheck size={12} />}
            Reservar
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> {error}
        </p>
      )}
      {success && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gold">
          <FaCheckCircle size={10} /> Reserva registrada.
        </p>
      )}
    </div>
  );
}
