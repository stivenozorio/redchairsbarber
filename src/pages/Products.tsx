import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCheckCircle,
  FaCoins,
  FaExchangeAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaWhatsapp,
} from "react-icons/fa";
import PageHero from "../components/PageHero";
import SectionHeading from "../components/SectionHeading";
import Reveal from "../components/Reveal";
import { useAuth } from "../auth/useAuth";
import { useMemberSummary } from "../hooks/useMemberSummary";
import { useActiveProducts, type ActiveProduct } from "../hooks/useActiveProducts";
import { useRedeemProduct } from "../hooks/useRedeemProduct";
import { formatCop } from "../lib/format";
import { PHONE_NUMBER } from "../data/site";

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

interface Feedback {
  type: "success" | "error";
  message: string;
}

/**
 * Catálogo público de productos, con dos formas de llevárselo:
 *
 * - "Comprar" (precio en pesos): no hay carrito ni cobro en línea, solo
 *   abre WhatsApp con el producto ya escrito para que el barbero lo
 *   separe. No requiere cuenta.
 * - "Canjear" (con puntos): SÍ descuenta los puntos al instante (canje
 *   en línea, sin pasar por el mostrador) y además abre WhatsApp para
 *   avisarle al barbero que lo aparte. Requiere sesión.
 *
 * A pedido explícito del negocio ("siempre tenemos existencias") no hay
 * control de inventario en ninguno de los dos casos. El canje con
 * puntos queda pendiente de recoger en el local (reward_redemptions,
 * status 'pending'); un miembro del staff lo marca como entregado
 * desde /admin/canjes.
 */
export default function Products() {
  const { session, profile } = useAuth();
  const { summary, reload: reloadSummary } = useMemberSummary(profile?.id);
  const products = useActiveProducts();
  const { redeem, redeeming } = useRedeemProduct();
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const pointsBalance = summary?.points_balance ?? 0;

  const groups = products ? groupByCategory(products) : [];

  const buildWhatsappLines = (intro: string) =>
    [intro, profile?.full_name ? `Mi nombre es ${profile.full_name}.` : null, "¿Me lo pueden separar para pasar a recogerlo?"].filter(
      (line): line is string => Boolean(line)
    );

  const handleBuy = (product: ActiveProduct) => {
    const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(
      buildWhatsappLines(
        `Hola Red Chairs Barber, quiero comprar "${product.name}" (${formatCop(product.price_cop)}).`
      ).join("\n")
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRedeem = async (product: ActiveProduct) => {
    if (
      !window.confirm(
        `¿Canjear "${product.name}" por ${product.points_cost} puntos? Podrás recogerlo en el local. Esto no se puede deshacer.`
      )
    ) {
      return;
    }

    // La pestaña de WhatsApp se abre en blanco ya, dentro del gesto del
    // usuario — igual que en Booking.tsx. Si se abriera después del
    // await al servidor, Safari y otros navegadores móviles la
    // bloquean en silencio.
    const whatsappTab = window.open("", "_blank");
    if (whatsappTab) whatsappTab.opener = null;

    setRedeemingId(product.id);
    setFeedback((prev) => ({ ...prev, [product.id]: undefined as unknown as Feedback }));
    const result = await redeem(product.id);
    setRedeemingId(null);
    if (!result.ok) {
      whatsappTab?.close();
      setFeedback((prev) => ({ ...prev, [product.id]: { type: "error", message: result.error ?? "No se pudo procesar el canje." } }));
      return;
    }
    await reloadSummary();

    const url = `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(
      buildWhatsappLines(
        `Hola Red Chairs Barber, acabo de canjear "${product.name}" por ${product.points_cost} puntos en el sitio.`
      ).join("\n")
    )}`;
    if (whatsappTab && !whatsappTab.closed) {
      whatsappTab.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }

    setFeedback((prev) => ({
      ...prev,
      [product.id]: {
        type: "success",
        message: "¡Canjeado! Le avisamos al barbero por WhatsApp — pasa por el local a recogerlo.",
      },
    }));
  };

  return (
    <div>
      <PageHero
        eyebrow="RED CLUB"
        title="Productos"
        subtitle="Pomadas, tratamientos y kits para seguir el cuidado desde casa — cómpralos en efectivo o canjéalos con tus puntos RED CLUB, y te avisamos al barbero por WhatsApp para que te lo separe."
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
                    const canRedeem = Boolean(session) && pointsBalance >= product.points_cost;
                    const isRedeeming = redeemingId === product.id;
                    const result = feedback[product.id];
                    return (
                      <Reveal key={product.id} delay={0.05 * (i % 3)}>
                        <div className="card-lux flex h-full flex-col overflow-hidden !p-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-48 w-full bg-charcoal object-contain"
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

                            <div className="mt-4 flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => handleBuy(product)}
                                className="btn-outline !py-2.5 text-xs"
                              >
                                <FaWhatsapp size={12} />
                                <span className="ml-2">Comprar</span>
                              </button>

                              {session ? (
                                <button
                                  type="button"
                                  disabled={!canRedeem || redeeming}
                                  onClick={() => void handleRedeem(product)}
                                  className="btn-gold !py-2.5 text-xs disabled:opacity-40"
                                >
                                  {isRedeeming ? (
                                    <FaSpinner className="animate-spin" />
                                  ) : (
                                    <FaExchangeAlt size={11} />
                                  )}
                                  <span className="ml-2">
                                    {canRedeem ? "Canjear" : `Te faltan ${product.points_cost - pointsBalance} pts`}
                                  </span>
                                </button>
                              ) : (
                                <Link
                                  to="/club/entrar"
                                  className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest2 text-gold/80 transition-colors hover:text-gold"
                                >
                                  Inicia sesión para canjear con puntos
                                </Link>
                              )}
                            </div>
                            {result?.type === "success" && (
                              <p className="mt-2 flex items-center gap-1.5 text-xs text-gold">
                                <FaCheckCircle size={10} /> {result.message}
                              </p>
                            )}
                            {result?.type === "error" && (
                              <p className="mt-2 flex items-center gap-1.5 text-xs text-blood">
                                <FaExclamationTriangle size={10} /> {result.message}
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
              ¿Cómo <span className="text-gold">recojo</span> lo que pedí?
            </h2>
            <p className="body-muted mx-auto mt-5 max-w-xl text-lg">
              "Comprar" y "Canjear" avisan por WhatsApp al barbero para que te lo separe — el
              canje con puntos además descuenta el saldo al instante. En los dos casos, pasas
              por el local en tu próxima visita a recogerlo y pagarlo (si aplica).
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
