import { FaSpinner } from "react-icons/fa";
import { usePointsHistory } from "../../hooks/usePointsHistory";
import { POINTS_REASON_LABEL } from "../../data/pointsReason";
import { formatShortDate } from "../../lib/format";

/**
 * Historial de movimientos de puntos (ganados, canjeados, reembolsados)
 * en "Mi cuenta". Solo lectura: points_transactions es un ledger
 * append-only, así que esta pantalla nunca modifica ni recalcula nada,
 * solo muestra lo que ya existe.
 */
export default function PointsHistory({ userId }: { userId: string | undefined }) {
  const { transactions, loading, error } = usePointsHistory(userId);

  if (!userId) return null;

  return (
    <div className="card-lux">
      <p className="eyebrow justify-start before:hidden">Historial de puntos</p>

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-bone/60">
            <FaSpinner className="animate-spin text-gold" /> Cargando...
          </p>
        ) : error ? (
          <p className="text-sm text-blood">No se pudo cargar tu historial de puntos: {error}</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-bone/60">Todavía no tienes movimientos de puntos.</p>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-4 border-b border-gold/10 pb-3 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm text-ivory/90">{POINTS_REASON_LABEL[tx.reason] ?? tx.reason}</p>
                <p className="mt-0.5 text-xs text-bone/50">
                  {tx.description ?? "—"} · {formatShortDate(tx.created_at)}
                </p>
              </div>
              <span
                className={`shrink-0 font-display text-lg ${tx.amount > 0 ? "text-gold" : "text-blood"}`}
              >
                {tx.amount > 0 ? "+" : ""}
                {tx.amount}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
