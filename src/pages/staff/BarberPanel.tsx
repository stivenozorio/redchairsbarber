import { useEffect, useMemo, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { useAuth } from "../../auth/useAuth";
import { supabase } from "../../lib/supabase";
import { BARBERS } from "../../data/booking";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_ORDER } from "../../data/bookingStatus";
import { fieldClass, labelClass } from "../../lib/ui";
import { todayBogotaRange } from "../../lib/format";
import { useStaffBookings } from "../../hooks/useStaffBookings";
import BookingStatusRow from "../../components/staff/BookingStatusRow";
import ClientProfileModal from "../../components/staff/ClientProfileModal";
import BlockSlotForm from "../../components/staff/BlockSlotForm";
import DayOffForm from "../../components/staff/DayOffForm";
import type { BookingStatus } from "../../types/club";

const STATUS_FILTERS: ("all" | BookingStatus)[] = ["all", ...BOOKING_STATUS_ORDER];

/**
 * Panel del barbero: agenda del día, con confirmación de asistencia.
 *
 * Un barbero ve SOLO su propia agenda (resuelta vía barbers.user_id, sin
 * selector); un admin que entra aquí y no tiene un barbero vinculado a su
 * cuenta ve un selector para revisar la agenda de cualquiera. La
 * restricción real de qué puede MODIFICAR un barbero (solo sus propias
 * citas) la aplica el servidor en /api/staff/booking-status — esto es
 * solo el filtro por defecto de la pantalla.
 */
export default function BarberPanel() {
  const { profile } = useAuth();
  // undefined = todavía resolviendo; null = no vinculado a ningún barbero.
  const [ownBarberId, setOwnBarberId] = useState<string | null | undefined>(undefined);
  const [pickedBarberId, setPickedBarberId] = useState("any");
  const [date, setDate] = useState(() => todayBogotaRange().dateStr);
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!supabase || !profile) {
      setOwnBarberId(null);
      return;
    }
    supabase
      .from("barbers")
      .select("id")
      .eq("user_id", profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setOwnBarberId(data?.id ?? null);
      });
    return () => {
      active = false;
    };
  }, [profile]);

  const effectiveBarberId = ownBarberId ?? pickedBarberId;

  const { dateFrom, dateTo } = useMemo(() => {
    const next = new Date(`${date}T00:00:00-05:00`);
    next.setUTCDate(next.getUTCDate() + 1);
    return { dateFrom: `${date}T00:00:00-05:00`, dateTo: next.toISOString() };
  }, [date]);

  const { bookings, loading, error, setBookings, reload } = useStaffBookings({
    barberId: effectiveBarberId,
    dateFrom,
    dateTo,
    search,
    ascending: true,
    limit: 300,
  });

  const handleChanged = (updated: (typeof bookings)[number]) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const filtered = statusFilter === "all" ? bookings : bookings.filter((b) => b.status === statusFilter);

  // Los bloqueos (source === 'blocked') no son citas reales — se
  // excluyen de las tarjetas de resumen para no inflar "Agenda del
  // día"/"Pendientes" con horarios reservados para clientes presenciales.
  const realBookings = bookings.filter((b) => b.source !== "blocked");
  const counts = {
    total: realBookings.length,
    pendientes: realBookings.filter((b) => b.status === "pending" || b.status === "confirmed").length,
    completadas: realBookings.filter((b) => b.status === "completed").length,
    canceladas: realBookings.filter((b) => b.status === "cancelled").length,
    noAsistio: realBookings.filter((b) => b.status === "no_show").length,
  };

  const tiles = [
    { label: "Agenda del día", value: counts.total },
    { label: "Pendientes", value: counts.pendientes },
    { label: "Completadas", value: counts.completadas },
    { label: "Canceladas", value: counts.canceladas },
    { label: "No asistieron", value: counts.noAsistio },
  ];

  const stillResolvingOwnBarber = ownBarberId === undefined;
  const isUnlinkedBarber = profile?.role === "barber" && ownBarberId === null;

  return (
    <div className="min-h-[100svh] bg-obsidian pt-28">
      <div className="container-lux pb-24">
        <p className="eyebrow justify-start before:hidden">Red Club</p>
        <h1 className="heading-xl mt-4">Panel del barbero</h1>

        {stillResolvingOwnBarber ? (
          <p className="mt-10 flex items-center gap-2 text-sm text-bone/60">
            <FaSpinner className="animate-spin text-gold" /> Cargando...
          </p>
        ) : isUnlinkedBarber ? (
          <div className="card-lux mt-10">
            <p className="text-sm text-bone/70">
              Tu cuenta todavía no está vinculada a ningún barbero. Pide que un administrador te
              vincule desde la base de datos.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {tiles.map((tile) => (
                <div key={tile.label} className="card-lux text-center">
                  <p className="font-display text-4xl text-gold">{tile.value}</p>
                  <p className="mt-2 text-xs uppercase tracking-widest2 text-bone/60">{tile.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={fieldClass}
                />
              </div>
              {!ownBarberId && (
                <div>
                  <label className={labelClass}>Barbero</label>
                  <select
                    value={pickedBarberId}
                    onChange={(e) => setPickedBarberId(e.target.value)}
                    className={fieldClass}
                  >
                    {BARBERS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id === "any" ? "Todos" : b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={ownBarberId ? "sm:col-span-2" : ""}>
                <label className={labelClass}>Buscar cliente</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre o teléfono"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <BlockSlotForm
                barberId={effectiveBarberId === "any" ? null : effectiveBarberId}
                date={date}
                onBlocked={() => void reload()}
              />
              <DayOffForm
                barberId={effectiveBarberId === "any" ? null : effectiveBarberId}
                defaultDate={date}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-sm px-4 py-2 text-xs uppercase tracking-widest2 transition-colors ${
                    statusFilter === status ? "bg-gold text-obsidian" : "text-bone/70 hover:text-gold"
                  }`}
                >
                  {status === "all" ? "Todas" : BOOKING_STATUS_LABEL[status]}
                </button>
              ))}
            </div>

            <div className="mt-8 space-y-4">
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-bone/60">
                  <FaSpinner className="animate-spin text-gold" /> Cargando agenda...
                </p>
              ) : error ? (
                <p className="text-sm text-blood">No se pudo cargar la agenda: {error}</p>
              ) : filtered.length === 0 ? (
                <div className="card-lux">
                  <p className="text-sm text-bone/70">No hay citas que coincidan con estos filtros.</p>
                </div>
              ) : (
                filtered.map((booking) => (
                  <BookingStatusRow
                    key={booking.id}
                    booking={booking}
                    onChanged={handleChanged}
                    onOpenClient={setClientId}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {clientId && <ClientProfileModal userId={clientId} onClose={() => setClientId(null)} />}
    </div>
  );
}
