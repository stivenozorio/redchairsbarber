import { Link } from "react-router-dom";
import { FaCheckCircle, FaCoins, FaSpinner } from "react-icons/fa";
import PageHero from "../components/PageHero";
import SectionHeading from "../components/SectionHeading";
import Reveal from "../components/Reveal";
import { useAuth } from "../auth/useAuth";
import { useMemberSummary } from "../hooks/useMemberSummary";
import { useActiveProducts, type ActiveProduct } from "../hooks/useActiveProducts";
import { formatCop } from "../lib/format";

const UNCATEGORIZED = "Otros";

function groupByCategory(products: ActiveProduct[]): { category: string; products: ActiveProduct[] }[] {
  const order: string[] = [];
  const byCategory = new Map<string, ActiveProduct[]>();
  for (const product of products) {
    const category = product.category?.trim() || UNCATEGORIZED;
    if (!byCategory.has(category)) {
      order.push(category);
      byCategory.set(category, []);
    }
    byCategory.get(category)?.push(product);
  }
  return order.map((category) => ({ category, products: byCategory.get(category) ?? [] }));
}

/**
 * Catálogo público de productos — solo para conocer qué hay y cuántos
 * puntos cuesta cada uno. El canje en sí NO se hace desde aquí: pasa
 * por el mostrador (el administrador lo registra con "Canjear puntos
 * presencial" cuando el cliente ya está en el local a recoger el
 * producto) — a propósito, porque el catálogo no lleva control de
 * existencias todavía y así nunca se descuentan puntos por algo que ya
 * no hay physicamente disponible.
 */
export default function Products() {
  const { session, profile } = useAuth();
  const { summary } = useMemberSummary(profile?.id);
  const products = useActiveProducts();
  const pointsBalance = summary?.points_balance ?? 0;

  const groups = products ? groupByCategory(products) : [];

  return (
    <div>
      <PageHero
        eyebrow="RED CLUB"
        title="Productos"
        subtitle="Pomadas, tratamientos y kits para seguir el cuidado desde casa — cada uno se puede pagar en efectivo o canjear con tus puntos RED CLUB en el local."
      />

      <section className="border-b border-gold/10 bg-obsidian py-24">
        <div className="container-lux">
          {session && (
            <Reveal>
              <div className="card-lux mb-14 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-bone/70">Tu saldo actual</p>
                <span className="flex items-center gap-2 font-display text-2xl text-gold">
                  <FaCoins size={18} /> {pointsBalance} puntos
                </span>
              </div>
            </Reveal>
          )}

          {products === null ? (
            <p className="flex items-center justify-center gap-2 text-sm text-bone/60">
              <FaSpinner className="animate-spin text-gold" /> Cargando productos...
            </p>
          ) : products.length === 0 ? (
            <p className="text-center text-sm text-bone/60">
              Todavía no hay productos disponibles — vuelve pronto.
            </p>
          ) : (
            groups.map((group, idx) => (
              <div key={group.category} className={idx > 0 ? "mt-16" : ""}>
                <SectionHeading eyebrow="Cuidado en casa" title={group.category} align="left" />
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {group.products.map((product, i) => {
                    const canRedeem = session && pointsBalance >= product.points_cost;
                    return (
                      <Reveal key={product.id} delay={0.05 * (i % 3)}>
                        <div className="card-lux flex h-full flex-col overflow-hidden !p-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-48 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-48 w-full items-center justify-center bg-charcoal text-bone/30">
                              <span className="text-xs uppercase tracking-widest2">Red Chairs</span>
                            </div>
                          )}
                          <div className="flex flex-1 flex-col p-6">
                            <p className="font-display text-lg text-ivory">{product.name}</p>
                            {product.description && (
                              <p className="mt-2 flex-1 text-sm leading-relaxed text-bone/60">
                                {product.description}
                              </p>
                            )}
                            <div className="mt-5 flex items-center justify-between gap-3 border-t border-gold/10 pt-4">
                              <span className="text-sm text-bone/70">{formatCop(product.price_cop)}</span>
                              <span className="flex items-center gap-1.5 font-display font-semibold text-gold">
                                <FaCoins size={12} /> {product.points_cost}
                              </span>
                            </div>
                            {session && (
                              <p
                                className={`mt-3 flex items-center gap-1.5 text-xs uppercase tracking-widest2 ${
                                  canRedeem ? "text-gold" : "text-bone/40"
                                }`}
                              >
                                {canRedeem ? (
                                  <>
                                    <FaCheckCircle size={10} /> Ya puedes canjearlo
                                  </>
                                ) : (
                                  `Te faltan ${product.points_cost - pointsBalance} puntos`
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </Reveal>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="bg-charcoal py-20">
        <div className="container-lux text-center">
          <Reveal>
            <h2 className="heading-lg">
              ¿Cómo <span className="text-gold">canjeo</span> un producto?
            </h2>
            <p className="body-muted mx-auto mt-5 max-w-xl text-lg">
              El canje se hace en el local, no en línea: coméntaselo a tu barbero en tu próxima
              visita y ahí se descuentan tus puntos.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/reservar" className="btn-gold">
                Reservar cita
              </Link>
              {!session && (
                <Link to="/club/registro" className="btn-outline">
                  Crear cuenta RED CLUB
                </Link>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
