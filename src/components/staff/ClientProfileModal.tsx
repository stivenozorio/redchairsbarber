import { useEffect, useState } from "react";
import { FaBirthdayCake, FaSpinner, FaTimes } from "react-icons/fa";
import { supabase } from "../../lib/supabase";
import type { ClubMemberSummary } from "../../types/club";
import { useMyBookings } from "../../hooks/useMyBookings";
import { BOOKING_STATUS_LABEL } from "../../data/bookingStatus";
import { formatBirthday, formatShortDate, formatTime } from "../../lib/format";

/**
 * Ficha del cliente, abierta desde una reserva en el panel administrativo
 * o del barbero. Reutiliza useMyBookings tal cual (ya recibe el userId
 * como parámetro — no está atado a "el usuario de la sesión actual") en
 * vez de duplicar la lógica de consulta de reservas.
 */
export default function ClientProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [summary, setSummary] = useState<ClubMemberSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const { upcoming, past, loading: loadingBookings, error: bookingsError } = useMyBookings(userId);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setLoadingSummary(false);
      return;
    }
    setLoadingSummary(true);
    supabase
      .from("club_member_summary")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setSummaryError(error.message);
        setSummary((data as ClubMemberSummary) ?? null);
        setLoadingSummary(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-obsidian/80 p-4 py-12 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="card-lux w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {loadingSummary ? (
              <FaSpinner className="animate-spin text-gold" />
            ) : summary ? (
              <>
                <p className="font-display text-xl text-ivory">{summary.full_name || "Sin nombre"}</p>
                <p className="mt-1 truncate text-sm text-bone/60">{summary.email}</p>
                <p className="text-sm text-bone/60">{summary.phone || "Sin teléfono"}</p>
                {summary.birthday && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gold/70">
                    <FaBirthdayCake size={11} /> {formatBirthday(summary.birthday)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-blood">{summaryError ?? "No se encontró el cliente."}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 text-bone/50 transition-colors hover:text-gold"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {summary && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-widest2 text-bone/60">
            <span className="rounded-sm border border-gold/20 px-3 py-1">
              {summary.tier_name ?? "Sin nivel asignado"}
            </span>
            <span className="rounded-sm border border-gold/20 px-3 py-1">
              {summary.visit_count} visita{summary.visit_count === 1 ? "" : "s"}
            </span>
          </div>
        )}

        <div className="mt-6 border-t border-gold/10 pt-4">
          <p className="eyebrow justify-start before:hidden">Próximas reservas</p>
          <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
            {loadingBookings ? (
              <p className="text-sm text-bone/50">Cargando...</p>
            ) : bookingsError ? (
              <p className="text-sm text-blood">{bookingsError}</p>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-bone/50">Sin próximas reservas.</p>
            ) : (
              upcoming.map((b) => (
                <p key={b.id} className="text-sm text-bone/70">
                  {formatShortDate(b.starts_at)} · {formatTime(b.starts_at)} —{" "}
                  <span className="text-gold/70">{BOOKING_STATUS_LABEL[b.status]}</span>
                </p>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-gold/10 pt-4">
          <p className="eyebrow justify-start before:hidden">Historial de visitas</p>
          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
            {loadingBookings ? null : past.length === 0 ? (
              <p className="text-sm text-bone/50">Todavía no tiene visitas registradas.</p>
            ) : (
              past.map((b) => (
                <p key={b.id} className="text-sm text-bone/70">
                  {formatShortDate(b.starts_at)} —{" "}
                  <span className="text-gold/70">{BOOKING_STATUS_LABEL[b.status]}</span>
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
