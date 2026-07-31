import { Link } from "react-router-dom";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";
import { LogoWordmark } from "./Logo";
import {
  ADDRESS,
  HOURS,
  INSTAGRAM_HANDLE,
  INSTAGRAM_LINK,
  NAV_LINKS,
  PHONE_DISPLAY,
  TIKTOK_HANDLE,
  TIKTOK_LINK,
  WHATSAPP_LINK,
} from "../data/site";

export default function Footer() {
  return (
    <footer className="border-t border-gold/10 bg-charcoal">
      <div className="container-lux grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <LogoWordmark />
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-bone/60">
            Más que un corte, una experiencia. Barbería premium en el corazón
            de Bogotá desde 2021.
          </p>
        </div>

        <div>
          <h4 className="eyebrow mb-6 justify-start before:hidden">Menú</h4>
          <ul className="space-y-3">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-sm text-bone/70 transition-colors hover:text-gold"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/reservar"
                className="text-sm text-bone/70 transition-colors hover:text-gold"
              >
                Reservar cita
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="eyebrow mb-6 justify-start before:hidden">Horarios</h4>
          <ul className="space-y-3">
            {HOURS.map((h) => (
              <li key={h.day} className="text-sm text-bone/70">
                <span className="text-ivory/90">{h.day}</span>
                <br />
                {h.time}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="eyebrow mb-6 justify-start before:hidden">Contacto</h4>
          <p className="text-sm text-bone/70">{ADDRESS}</p>
          <div className="mt-5 flex gap-4">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 text-gold transition-colors hover:bg-gold hover:text-obsidian"
            >
              <FaWhatsapp />
            </a>
            <a
              href={INSTAGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 text-gold transition-colors hover:bg-gold hover:text-obsidian"
            >
              <FaInstagram />
            </a>
            <a
              href={TIKTOK_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 text-gold transition-colors hover:bg-gold hover:text-obsidian"
            >
              <FaTiktok />
            </a>
          </div>
          <p className="mt-5 text-sm text-bone/70">{PHONE_DISPLAY}</p>
          <p className="text-sm text-bone/70">{INSTAGRAM_HANDLE}</p>
          <p className="text-sm text-bone/70">{TIKTOK_HANDLE}</p>
        </div>
      </div>

      <div className="border-t border-gold/10">
        <div className="container-lux flex flex-col items-center justify-between gap-3 py-6 text-xs text-bone/50 md:flex-row">
          <p>
            Copyright © Red Chairs Barber. All Rights Reserved. Design by{" "}
            <a
              href="https://digicyus.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold/80 transition-colors hover:text-gold"
            >
              DIGICYUS
            </a>
          </p>
          <p className="tracking-widest2 uppercase text-gold/60">Bogotá · Colombia</p>
        </div>
      </div>
    </footer>
  );
}
