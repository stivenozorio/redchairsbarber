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
 * iniciar sesión (o registrarse — ver redirectTo). */
export default function ProtectedRoute({
  requireStaff = false,
  requireAdmin = false,
  redirectTo = "/club/entrar",
}: {
  requireStaff?: boolean;
  requireAdmin?: boolean;
  /** A dónde mandar a quien no tiene sesión. Por defecto, login — pero
   * /reservar usa /club/registro: alguien sin cuenta que llega ahí
   * probablemente no tenga cuenta que iniciar, así que tiene más
   * sentido llevarlo directo a crear una. */
  redirectTo?: string;
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
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/club" replace />;
  }

  if (requireStaff && !isStaff) {
    return <Navigate to="/club" replace />;
  }

  return <Outlet />;
}
