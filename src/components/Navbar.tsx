import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HiMenuAlt4, HiX } from "react-icons/hi";
import { LogoWordmark } from "./Logo";
import { NAV_LINKS } from "../data/site";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
        scrolled
          ? "border-b border-gold/10 bg-obsidian/90 backdrop-blur-md"
          : "bg-gradient-to-b from-obsidian/80 to-transparent"
      }`}
    >
      <div className="container-lux flex h-20 items-center justify-between">
        <Link to="/" onClick={() => setOpen(false)}>
          <LogoWordmark />
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `font-body text-[13px] uppercase tracking-[0.15em] transition-colors duration-300 ${
                  isActive ? "text-gold" : "text-ivory/80 hover:text-gold"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Link to="/reservar" className="btn-gold !py-3 !px-6 text-[11px]">
            Reservar cita
          </Link>
        </div>

        <button
          aria-label="Abrir menú"
          onClick={() => setOpen(true)}
          className="text-ivory lg:hidden"
        >
          <HiMenuAlt4 size={28} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-obsidian lg:hidden"
          >
            <div className="container-lux flex h-20 items-center justify-between">
              <LogoWordmark />
              <button aria-label="Cerrar menú" onClick={() => setOpen(false)} className="text-ivory">
                <HiX size={28} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col items-center justify-center gap-8">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <NavLink
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `font-display text-3xl ${isActive ? "text-gold" : "text-ivory"}`
                    }
                  >
                    {link.label}
                  </NavLink>
                </motion.div>
              ))}
              <Link
                to="/reservar"
                onClick={() => setOpen(false)}
                className="btn-gold mt-4"
              >
                Reservar cita
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
