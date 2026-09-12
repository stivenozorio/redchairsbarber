import { useState } from "react";
import { FaBan, FaCheck, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import { useAuth } from "../../auth/useAuth";
import { useProductRedemptions, type RedemptionStatus } from "../../hooks/useProductRedemptions";
import { useProductRedemptionActions } from "../../hooks/useProductRedemptionActions";
import { formatShortDate, formatTime } from "../../lib/format";

const STATUS_LABEL: Record<RedemptionStatus, string> = {
  pending: "Pendiente de recoger",
  fulfilled: "Entregado",
  cancelled: "Cancelado",
  expired: "Vencido",
};

const STATUS_FILTERS: ("all" | RedemptionStatus)[] = ["pending", "fulfilled", "cancelled", "all"];

/**
 * Canjes de producto EN LÍNEA pendientes de entregar en el local — lo
 * que un cliente pagó con puntos desde /productos sin pasar por el
 * mostrador. "Entregar" lo puede confirmar cualquier barbero o admin
 * (no toca puntos); "Cancelar y devolver puntos" solo un admin (sí los
 * toca) — ver 0025_product_redemptions.sql.
 */
export default function AdminRedemptions() {
  const { isAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | RedemptionStatus>("pending");
  const { redemptions, loading, error, setRedemptions } = useProductRedemptions(statusFilter);
  const { fulfill, cancel, updatingId } = useProductRedemptionActions();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleFulfill = async (id: string) => {
    setActionError(null);
    const result = await fulfill(id);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setRedemptions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "fulfilled", fulfilled_at: new Date().toISOString() } : r))
    );
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("¿Cancelar este canje y devolverle los puntos al cliente? No se puede deshacer.")) return;
    setActionError(null);
    const result = await cancel(id);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setRedemptions((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
  };

  return (
    <div>
      <p className="text-sm text-bone/60">
        Productos que un cliente canjeó desde /productos y todavía no ha recogido en el local.
        "Entregar" lo puede confirmar cualquier barbero; "Cancelar y devolver puntos" solo un
        administrador.
      </p>

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
            {status === "all" ? "Todos" : STATUS_LABEL[status]}
          </button>
        ))}
      </div>

      {actionError && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-blood">
          <FaExclamationTriangle size={10} /> {actionError}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-bone/60">
            <FaSpinner className="animate-spin text-gold" /> Cargando canjes...
          </p>
        ) : error ? (
          <p className="text-sm text-blood">No se pudieron cargar los canjes: {error}</p>
        ) : redemptions.length === 0 ? (
          <div className="card-lux">
            <p className="text-sm text-bone/70">No hay canjes que coincidan con este filtro.</p>
          </div>
        ) : (
          redemptions.map((r) => {
            const updating = updatingId === r.id;
            return (
              <div key={r.id} className="card-lux flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-display text-lg text-ivory">{r.product_name}</p>
                  <p className="mt-1 text-sm text-bone/70">
                    {r.customer_name || r.customer_email || "Cliente sin nombre"}
                    {r.customer_phone ? ` · ${r.customer_phone}` : ""}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-widest2 text-bone/50">
                    <span>{formatShortDate(r.created_at)}</span>
                    <span>{formatTime(r.created_at)}</span>
                    <span className="text-gold/70">{r.points_spent} puntos</span>
                    <span>{STATUS_LABEL[r.status]}</span>
                  </p>
                </div>
                {r.status === "pending" && (
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => void handleFulfill(r.id)}
                      className="btn-gold !py-2 !px-4 text-xs disabled:opacity-50"
                    >
                      {updating ? <FaSpinner className="animate-spin" /> : <FaCheck size={11} />}
                      <span className="ml-2">Entregar</span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => void handleCancel(r.id)}
                        className="flex items-center gap-1.5 text-xs uppercase tracking-widest2 text-blood/70 transition-colors hover:text-blood disabled:opacity-50"
                      >
                        <FaBan size={10} /> Cancelar y devolver puntos
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
