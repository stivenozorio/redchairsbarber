import { FaCheck, FaCrown } from "react-icons/fa";
import Reveal from "./Reveal";
import type { LoyaltyTier } from "../data/loyalty";

export default function LoyaltyCard({ tier, delay = 0 }: { tier: LoyaltyTier; delay?: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div
        className="relative flex h-full flex-col overflow-hidden rounded-sm border p-8 transition-transform duration-500 hover:-translate-y-2"
        style={{
          borderColor: `${tier.color}55`,
          background: `linear-gradient(160deg, ${tier.color}22, #0a0a0c 60%)`,
          boxShadow: `0 25px 60px -30px ${tier.glow}`,
        }}
      >
        <div
          className="absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl"
          style={{ background: tier.glow }}
        />
        <FaCrown size={22} style={{ color: tier.color }} />
        <h3
          className="mt-4 font-display text-3xl font-bold tracking-wide"
          style={{ color: tier.color }}
        >
          {tier.name}
        </h3>
        <p className="mt-1 text-xs uppercase tracking-widest2 text-bone/60">{tier.visits}</p>
        <div className="my-6 h-px w-full bg-white/10" />
        <ul className="space-y-3">
          {tier.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-bone/80">
              <FaCheck className="mt-1 shrink-0" style={{ color: tier.color }} size={11} />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}
