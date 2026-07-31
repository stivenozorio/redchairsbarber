import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { HiMenuAlt4 } from "react-icons/hi";
import { FaUserCircle, FaUserShield } from "react-icons/fa";
import { LogoWordmark } from "./Logo";
import MobileMenu from "./MobileMenu";
import { NAV_LINKS } from "../data/site";
import { isSupabaseConfigured } from "../lib/supabase";
import { useAuth } from "../auth/useAuth";

interface NavbarProps {
  onMenuOpenChange?: (open: boolean) => void;
}

export default function Navbar({ onMenuOpenChange }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    onMenuOpenChange?.(open);
  }, [open, onMenuOpenChange]);

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

        <div className="hidden items-center gap-5 lg:flex">
          {isSupabaseConfigured && isAuthenticated && isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 font-body text-[13px] uppercase tracking-[0.15em] text-ivory/80 transition-colors duration-300 hover:text-gold"
            >
              <FaUserShield size={16} />
              Admin
            </Link>
          )}
          {isSupabaseConfigured && (
            <Link
              to={isAuthenticated ? "/club" : "/club/entrar"}
              className="flex items-center gap-2 font-body text-[13px] uppercase tracking-[0.15em] text-ivory/80 transition-colors duration-300 hover:text-gold"
            >
              <FaUserCircle size={16} />
              {isAuthenticated ? "Mi cuenta" : "Entrar"}
            </Link>
          )}
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

      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
