import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Reveal from "../Reveal";
import { LogoBadge } from "../Logo";

/** Marco compartido de las pantallas de autenticación de RED CLUB.
 * Mantiene el mismo lenguaje visual del sitio (obsidiana, dorado,
 * card-lux) para que el club no se sienta como otra aplicación. */
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-obsidian px-6 py-32">
      <div className="absolute inset-0 bg-radial-fade opacity-80" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #c9a961 0, #c9a961 1px, transparent 1px, transparent 60px)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <Reveal>
          <Link to="/" className="mb-8 flex justify-center">
            <LogoBadge className="h-20 w-auto" />
          </Link>

          <div className="card-lux">
            <div className="text-center">
              <p className="eyebrow">{eyebrow}</p>
              <h1 className="heading-md mt-4">{title}</h1>
              {subtitle && <p className="mt-3 text-sm leading-relaxed text-bone/70">{subtitle}</p>}
            </div>

            <div className="mt-8">{children}</div>
          </div>

          {footer && <div className="mt-6 text-center text-sm text-bone/60">{footer}</div>}
        </Reveal>
      </div>
    </section>
  );
}
