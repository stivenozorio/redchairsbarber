import { LogoBadge } from "./Logo";

/**
 * Se muestra en vez de todo el sitio cuando el hostname es el dominio
 * viejo de Vercel (redchairsbarber.vercel.app) — ver el check en
 * App.tsx. Vive directo en el bundle de React en vez de depender de
 * un rewrite de vercel.json: así no importa ninguna configuración
 * aparte del proyecto en Vercel, siempre se muestra.
 */
const NEW_ORIGIN = "https://redchairsbarber.digicyus.com";

export default function MovedNotice() {
  const homeDestination =
    typeof window === "undefined"
      ? NEW_ORIGIN
      : `${NEW_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;

  return (
    <section className="flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-obsidian px-6 text-center">
      <div className="absolute inset-0 bg-radial-fade" />
      <div className="container-lux relative z-10 flex flex-col items-center">
        <LogoBadge className="mx-auto mb-10 h-28 w-28 sm:h-32 sm:w-32" />

        <p className="eyebrow">Barbería Premium · Bogotá</p>

        <h1 className="heading-xl mt-6 max-w-2xl">
          Nos mudamos
          <br />
          <span className="text-blood">de dirección.</span>
        </h1>

        <p className="body-muted mt-8 max-w-xl text-lg">
          Red Chairs Barber ahora vive en{" "}
          <span className="font-semibold text-gold">redchairsbarber.digicyus.com</span>.
          Ahí sigue todo: reservas, servicios y tu cuenta RED CLUB.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a href={homeDestination} className="btn-gold">
            Ir al sitio nuevo
          </a>
          <a href={`${NEW_ORIGIN}/reservar`} className="btn-outline">
            Reservar cita
          </a>
        </div>
      </div>
    </section>
  );
}
