import { Navigate, Outlet, useLocation } from "react-router-dom";
import { FaSpinner } from "react-icons/fa";
import { useAuth } from "../auth/useAuth";
import { isSupabaseConfigured } from "../lib/supabase";

/** Envuelve las rutas de RED CLUB que exigen sesión iniciada.
 *
 * Espera a que termine de restaurarse la sesión antes de decidir: sin
 * eso, al recargar /club el usuario vería un parpadeo hacia el login
 * aunque su sesión sea válida.
 *
 * Guarda la ruta de origen para devolver al usuario ahí después de
 * iniciar sesión. */
export default function ProtectedRoute({
  requireStaff = false,
  requireAdmin = false,
}: {
  requireStaff?: boolean;
  requireAdmin?: boolean;
}) {
  const { initializing, isAuthenticated, isStaff, isAdmin, profileLoading } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return <Navigate to="/" replace />;
  }

  if (initializing || (isAuthenticated && (requireStaff || requireAdmin) && profileLoading)) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-obsidian">
        <FaSpinner className="animate-spin text-2xl text-gold" aria-label="Cargando" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/club/entrar" replace state={{ from: location.pathname }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/club" replace />;
  }

  if (requireStaff && !isStaff) {
    return <Navigate to="/club" replace />;
  }

  return <Outlet />;
}
