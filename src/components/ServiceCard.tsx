import { FaCheck } from "react-icons/fa";
import Reveal from "./Reveal";
import type { Service } from "../data/services";

export default function ServiceCard({ service, delay = 0 }: { service: Service; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <div className="card-lux group flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-xl text-ivory">{service.name}</h3>
          <span className="whitespace-nowrap font-display text-xl font-semibold text-gold">
            {service.price}
          </span>
        </div>
        <div className="divider-gold my-5 !mx-0 !w-12 opacity-40 group-hover:opacity-100 transition-opacity" />
        {service.description && (
          <p className="text-sm leading-relaxed text-bone/70">{service.description}</p>
        )}
        {service.includes && (
          <ul className="mt-4 space-y-2">
            {service.includes.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-bone/70">
                <FaCheck className="mt-1 shrink-0 text-gold" size={10} />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Reveal>
  );
}
