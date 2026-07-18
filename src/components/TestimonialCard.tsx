import { FaQuoteLeft, FaStar } from "react-icons/fa";
import Reveal from "./Reveal";
import type { Testimonial } from "../data/testimonials";

export default function TestimonialCard({ t, delay = 0 }: { t: Testimonial; delay?: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="card-lux flex h-full flex-col">
        <FaQuoteLeft className="text-gold/50" size={22} />
        <p className="mt-5 flex-1 font-display text-lg italic leading-relaxed text-ivory/90">
          “{t.quote}”
        </p>
        <div className="mt-6 flex items-center gap-1 text-gold">
          {Array.from({ length: t.rating }).map((_, i) => (
            <FaStar key={i} size={12} />
          ))}
        </div>
        <div className="mt-3">
          <p className="font-body text-sm font-semibold text-ivory">{t.name}</p>
          <p className="text-xs uppercase tracking-widest2 text-bone/50">{t.role}</p>
        </div>
      </div>
    </Reveal>
  );
}
