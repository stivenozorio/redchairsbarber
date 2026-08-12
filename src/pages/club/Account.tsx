import { Link } from "react-router-dom";
import { FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import PageHero from "../../components/PageHero";
import Reveal from "../../components/Reveal";
import BookingCard from "../../components/club/BookingCard";
import ProfileCard from "../../components/club/ProfileCard";
import DigitalCard from "../../components/club/DigitalCard";
import PhonePrompt from "../../components/club/PhonePrompt";
import PointsHistory from "../../components/club/PointsHistory";
import { useAuth } from "../../auth/useAuth";
import { useMyBookings } from "../../hooks/useMyBookings";

export default function Account() {
  const { user } = useAuth();
  const { upcoming, past, loading, error, reload } = useMyBookings(user?.id);

  const nextBooking = upcoming[0];

  return (
    <div>
      <PageHero
        eyebrow="Red Club"
        title="Mi cuenta"
        subtitle="Aquí puedes ver tus datos, tu próxima cita y todo tu historial en Red Chairs."
      />

      <section className="bg-charcoal py-24">
        <div className="container-lux">
          <PhonePrompt />

          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-10">
              <Reveal>
                <DigitalCard userId={user?.id} />
              </Reveal>
              <Reveal delay={0.05}>
                <ProfileCard />
              </Reveal>
              <Reveal delay={0.08}>
                <PointsHistory userId={user?.id} />
              </Reveal>
            </div>

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
                      <div className="card-lux">
                        <p className="flex items-start gap-2 text-sm text-blood">
                          <FaExclamationTriangle className="mt-0.5 shrink-0" /> {error}
                        </p>
                        <button
                          type="button"
                          onClick={() => void reload()}
                          className="btn-outline mt-6"
                        >
                          Reintentar
                        </button>
                      </div>
                    ) : nextBooking ? (
                      <BookingCard booking={nextBooking} highlight onUpdated={() => void reload()} />
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
                        <BookingCard key={booking.id} booking={booking} onUpdated={() => void reload()} />
                      ))}
                    </div>
                  </div>
                </Reveal>
              )}

              {!error && (
                <Reveal delay={0.2}>
                  <div>
                    <p className="eyebrow justify-start before:hidden">Historial</p>
                    <div className="mt-6 space-y-4">
                      {loading ? null : past.length > 0 ? (
                        past.map((booking) => <BookingCard key={booking.id} booking={booking} />)
                      ) : (
                        <div className="card-lux">
                          <p className="text-sm text-bone/70">
                            Todavía no tienes visitas registradas. Tu historial aparecerá aquí
                            después de tu primera cita.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
