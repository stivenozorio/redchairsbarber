import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HiX } from "react-icons/hi";
import { FaCut, FaUserCircle, FaUserShield } from "react-icons/fa";
import { LogoWordmark } from "./Logo";
import { NAV_LINKS } from "../data/site";
import { isSupabaseConfigured } from "../lib/supabase";
import { useAuth } from "../auth/useAuth";

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";
    style.overflow = "hidden";

    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.left = prev.left;
      style.right = prev.right;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  useBodyScrollLock(open);
  const { isAuthenticated, isAdmin, isStaff } = useAuth();

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex flex-col bg-obsidian lg:hidden"
        >
          <div className="container-lux flex h-20 shrink-0 items-center justify-between">
            <Link to="/" onClick={onClose}>
              <LogoWordmark />
            </Link>
            <button aria-label="Cerrar menú" onClick={onClose} className="text-ivory">
              <HiX size={28} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto py-8">
            {NAV_LINKS.map((link, i) => (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <NavLink
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `font-display text-3xl ${isActive ? "text-gold" : "text-ivory"}`
                  }
                >
                  {link.label}
                </NavLink>
              </motion.div>
            ))}
            {isSupabaseConfigured && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * NAV_LINKS.length }}
              >
                <NavLink
                  to={isAuthenticated ? "/club" : "/club/entrar"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 font-display text-3xl ${
                      isActive ? "text-gold" : "text-ivory"
                    }`
                  }
                >
                  <FaUserCircle size={22} className="text-gold/70" />
                  {isAuthenticated ? "Mi cuenta" : "Entrar"}
                </NavLink>
              </motion.div>
            )}
            {isSupabaseConfigured && isAuthenticated && isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (NAV_LINKS.length + 1) }}
              >
                <NavLink
                  to="/admin"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 font-display text-3xl ${isActive ? "text-gold" : "text-ivory"}`
                  }
                >
                  <FaUserShield size={22} className="text-gold/70" />
                  Admin
                </NavLink>
              </motion.div>
            )}
            {isSupabaseConfigured && isAuthenticated && isStaff && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * (NAV_LINKS.length + 2) }}
              >
                <NavLink
                  to="/barbero"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 font-display text-3xl ${isActive ? "text-gold" : "text-ivory"}`
                  }
                >
                  <FaCut size={22} className="text-gold/70" />
                  Panel del barbero
                </NavLink>
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * (NAV_LINKS.length + 3) }}
            >
              <Link to="/reservar" onClick={onClose} className="btn-gold mt-4">
                Reservar cita
              </Link>
            </motion.div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
