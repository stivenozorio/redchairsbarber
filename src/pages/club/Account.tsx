import { Link } from "react-router-dom";
import {
  FaEnvelope,
  FaExclamationTriangle,
  FaPhone,
  FaSignOutAlt,
  FaSpinner,
  FaUser,
} from "react-icons/fa";
import PageHero from "../../components/PageHero";
import Reveal from "../../components/Reveal";
import BookingCard from "../../components/club/BookingCard";
import { useAuth } from "../../auth/useAuth";
import { useMyBookings } from "../../hooks/useMyBookings";

export default function Account() {
  const { user, profile, profileLoading, signOut } = useAuth();
  const { upcoming, past, loading, error } = useMyBookings(user?.id);

  const nextBooking = upcoming[0];
  const displayName = profile?.full_name ?? user?.email ?? "";

  return (
    <div>
      <PageHero
        eyebrow="Red Club"
        title="Mi cuenta"
        subtitle="Aquí puedes ver tus datos, tu próxima cita y todo tu historial en Red Chairs."
      />

      <section className="bg-charcoal py-24">
        <div className="container-lux grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Datos personales */}
          <Reveal>
            <div className="card-lux h-full">
              <p className="eyebrow justify-start before:hidden">Tus datos</p>

              {profileLoading && !profile ? (
                <p className="mt-8 flex items-center gap-2 text-sm text-bone/60">
                  <FaSpinner className="animate-spin text-gold" /> Cargando...
                </p>
              ) : (
                <>
                  <h2 className="mt-4 font-display text-2xl text-ivory">{displayName}</h2>

                  <ul className="mt-8 space-y-5">
                    <li className="flex items-start gap-4">
                      <FaUser className="mt-1 shrink-0 text-gold/70" size={14} />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest2 text-bone/40">Nombre</p>
                        <p className="mt-1 text-sm text-ivory/90">
                          {profile?.full_name ?? "Sin registrar"}
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <FaEnvelope className="mt-1 shrink-0 text-gold/70" size={14} />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest2 text-bone/40">Correo</p>
                        <p className="mt-1 break-all text-sm text-ivory/90">
                          {profile?.email ?? user?.email ?? "Sin registrar"}
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <FaPhone className="mt-1 shrink-0 text-gold/70" size={14} />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest2 text-bone/40">
                          Teléfono
                        </p>
                        <p className="mt-1 text-sm text-ivory/90">
                          {profile?.phone ?? "Sin registrar"}
                        </p>
                      </div>
                    </li>
                  </ul>
                </>
              )}

              <div className="mt-10 space-y-3 border-t border-gold/10 pt-8">
                <Link to="/reservar" className="btn-gold w-full">
                  Reservar una cita
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="btn-outline flex w-full items-center justify-center gap-2"
                >
                  <FaSignOutAlt size={12} /> Cerrar sesión
                </button>
              </div>
            </div>
          </Reveal>

          {/* Próxima reserva + historial */}
          <div className="space-y-10">
            <Reveal delay={0.1}>
              <div>
                <p className="eyebrow justify-start before:hidden">Próxima reserva</p>
                <div className="mt-6">
                  {loading ? (
                    <p className="flex items-center gap-2 text-sm text-bone/60">
                      <FaSpinner className="animate-spin text-gold" /> Cargando tus reservas...
                    </p>
                  ) : error ? (
                    <p className="flex items-center gap-2 text-sm text-blood">
                      <FaExclamationTriangle /> {error}
                    </p>
                  ) : nextBooking ? (
                    <BookingCard booking={nextBooking} highlight />
                  ) : (
                    <div className="card-lux text-center">
                      <p className="text-sm text-bone/70">No tienes citas programadas.</p>
                      <Link to="/reservar" className="btn-outline mt-6 inline-flex">
                        Reservar ahora
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>

            {upcoming.length > 1 && (
              <Reveal delay={0.15}>
                <div>
                  <p className="eyebrow justify-start before:hidden">Otras citas programadas</p>
                  <div className="mt-6 space-y-4">
                    {upcoming.slice(1).map((booking) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            <Reveal delay={0.2}>
              <div>
                <p className="eyebrow justify-start before:hidden">Historial</p>
                <div className="mt-6 space-y-4">
                  {loading ? null : past.length > 0 ? (
                    past.map((booking) => <BookingCard key={booking.id} booking={booking} />)
                  ) : (
                    <div className="card-lux">
                      <p className="text-sm text-bone/70">
                        Todavía no tienes visitas registradas. Tu historial aparecerá aquí después
                        de tu primera cita.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
