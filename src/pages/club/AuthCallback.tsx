import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSpinner } from "react-icons/fa";
import { useAuth } from "../../auth/useAuth";

/** Punto de retorno del login con Google y de los enlaces de correo.
 *
 * El cliente de Supabase está configurado con detectSessionInUrl, así
 * que ya procesó los tokens de la URL antes de que este componente se
 * monte. Aquí solo se espera a que la sesión quede lista y se redirige. */
export default function AuthCallback() {
  const { initializing, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initializing) return;
    navigate(isAuthenticated ? "/club" : "/club/entrar", { replace: true });
  }, [initializing, isAuthenticated, navigate]);

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center gap-4 bg-obsidian">
      <FaSpinner className="animate-spin text-2xl text-gold" />
      <p className="text-sm text-bone/60">Iniciando sesión...</p>
    </div>
  );
}
