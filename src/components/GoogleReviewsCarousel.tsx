import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight, FaExternalLinkAlt, FaSpinner, FaStar } from "react-icons/fa";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

/**
 * Reseñas reales de Google, pedidas en vivo desde el navegador a
 * Places API (New) — ver README ("Reseñas de Google en el inicio")
 * para cómo conseguir el Place ID y crear/restringir la API key.
 *
 * Mismo patrón que isSupabaseConfigured (lib/supabase.ts): si faltan
 * las variables, o si Google no responde, la sección completa NO se
 * muestra — nunca un "cargando" colgado ni un error a la vista de un
 * cliente real. El motivo del fallo queda en la consola del navegador
 * para quien esté revisando (console.warn), no en la pantalla.
 */
const PLACE_ID = import.meta.env.VITE_GOOGLE_PLACE_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

const isGoogleReviewsConfigured = Boolean(PLACE_ID && API_KEY);

const MAX_REVIEWS = 5;
const AUTO_ADVANCE_MS = 7000;
const MAX_REVIEW_LENGTH = 320;

interface GoogleReview {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string; photoUri?: string };
}

interface PlaceDetails {
  rating?: number;
  userRatingCount?: number;
  reviews?: GoogleReview[];
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-1 text-gold" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <FaStar key={i} size={13} className={i < full ? "" : "text-bone/20"} />
      ))}
    </div>
  );
}

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const [broken, setBroken] = useState(false);
  const initial = name.charAt(0).toUpperCase() || "G";

  if (!photoUrl || broken) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-scarlet to-blood text-sm font-bold text-ivory">
        {initial}
      </span>
    );
  }
  return (
    <img
      src={photoUrl}
      alt=""
      loading="lazy"
      width={44}
      height={44}
      onError={() => setBroken(true)}
      className="h-11 w-11 shrink-0 rounded-full object-cover"
    />
  );
}

export default function GoogleReviewsCarousel() {
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isGoogleReviewsConfigured) return;
    let active = true;

    fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE_ID as string)}`, {
      headers: {
        "X-Goog-Api-Key": API_KEY as string,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          // Google manda el motivo exacto en el cuerpo de la respuesta
          // (por ejemplo "Invalid Place ID", "API key not valid", etc.) —
          // mostrarlo tal cual ahorra tener que adivinar entre Place ID
          // mal copiado, API sin activar, o clave sin el dominio
          // correcto en la restricción.
          const reason = data?.error?.message ?? `sin detalle (status ${res.status})`;
          throw new Error(`Places API respondió ${res.status} — ${reason}`);
        }
        return data as PlaceDetails;
      })
      .then((data) => {
        if (active) setPlace(data);
      })
      .catch((error) => {
        console.warn("[google-reviews]", error.message ?? error);
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const reviews = (place?.reviews ?? []).slice(0, MAX_REVIEWS);

  useEffect(() => {
    if (reviews.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % reviews.length), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [reviews.length]);

  if (!isGoogleReviewsConfigured || failed) return null;

  if (!place) {
    return (
      <section className="border-t border-gold/10 bg-obsidian py-28">
        <div className="container-lux flex justify-center">
          <FaSpinner className="animate-spin text-gold" size={22} />
        </div>
      </section>
    );
  }

  if (reviews.length === 0) return null;

  const current = reviews[index];
  const name = current.authorAttribution?.displayName ?? "Cliente de Google";
  const text = current.text?.text ?? current.originalText?.text ?? "";
  const mapsLink = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(PLACE_ID as string)}`;

  return (
    <section className="border-t border-gold/10 bg-obsidian py-28">
      <div className="container-lux">
        <SectionHeading
          eyebrow="Reseñas verificadas"
          title="Lo que dicen en Google"
          subtitle={
            place.rating
              ? `${place.rating.toFixed(1)} de 5 · ${place.userRatingCount ?? 0} reseñas en Google`
              : undefined
          }
        />

        <Reveal delay={0.15} className="mx-auto mt-14 max-w-2xl">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35 }}
                className="card-lux flex flex-col items-center text-center"
              >
                <Avatar name={name} photoUrl={current.authorAttribution?.photoUri} />
                <p className="mt-4 font-body text-sm font-semibold text-ivory">{name}</p>
                {current.relativePublishTimeDescription && (
                  <p className="text-xs text-bone/50">{current.relativePublishTimeDescription}</p>
                )}
                <div className="mt-3">
                  <Stars rating={current.rating ?? 5} />
                </div>
                <p className="mt-5 font-display text-lg italic leading-relaxed text-ivory/90">
                  “{truncate(text, MAX_REVIEW_LENGTH)}”
                </p>
              </motion.div>
            </AnimatePresence>

            {reviews.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Reseña anterior"
                  onClick={() => setIndex((i) => (i - 1 + reviews.length) % reviews.length)}
                  className="absolute left-0 top-1/2 hidden -translate-x-6 -translate-y-1/2 rounded-full border border-gold/20 p-3 text-bone/60 transition-colors hover:border-gold/50 hover:text-gold sm:flex"
                >
                  <FaChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  aria-label="Siguiente reseña"
                  onClick={() => setIndex((i) => (i + 1) % reviews.length)}
                  className="absolute right-0 top-1/2 hidden translate-x-6 -translate-y-1/2 rounded-full border border-gold/20 p-3 text-bone/60 transition-colors hover:border-gold/50 hover:text-gold sm:flex"
                >
                  <FaChevronRight size={14} />
                </button>
              </>
            )}
          </div>

          {reviews.length > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ir a la reseña ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-gold" : "w-1.5 bg-bone/30"
                  }`}
                />
              ))}
            </div>
          )}

          <div className="mt-10 flex flex-col items-center gap-4">
            <a
              href={`https://search.google.com/local/writereview?placeid=${encodeURIComponent(PLACE_ID as string)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              Escribir una reseña en Google
            </a>
            {/* Atribución que exigen los términos de uso de Places API. */}
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-bone/50 underline transition-colors hover:text-gold"
            >
              Reseñas vía Google <FaExternalLinkAlt size={9} />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
