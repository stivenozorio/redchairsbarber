import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FaExclamationTriangle, FaGoogle, FaSpinner } from "react-icons/fa";
import AuthShell from "../../components/club/AuthShell";
import { useAuth } from "../../auth/useAuth";
import { fieldClass } from "../../lib/ui";

export default function Login() {
  const { signIn, signInWithGoogle, isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/club";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!initializing && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    navigate(from, { replace: true });
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) {
      setError(googleError);
      setGoogleLoading(false);
    }
    // Si no hay error, el navegador se redirige a Google.
  };

  return (
    <AuthShell
      eyebrow="Red Club"
      title="Iniciar sesión"
      subtitle="Accede a tu cuenta para ver tus reservas y tu historial."
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link to="/club/registro" className="text-gold transition-colors hover:text-gold-light">
            Únete a RED CLUB
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          required
          type="email"
          autoComplete="email"
          placeholder="Tu correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
        <input
          required
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />

        <div className="text-right">
          <Link
            to="/club/recuperar"
            className="text-xs text-bone/60 transition-colors hover:text-gold"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-gold flex w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <FaSpinner className="animate-spin" /> Entrando...
            </>
          ) : (
            "Iniciar sesión"
          )}
        </button>

        {error && (
          <p className="flex items-center gap-2 text-sm text-blood">
            <FaExclamationTriangle className="shrink-0" /> {error}
          </p>
        )}
      </form>

      <div className="my-7 flex items-center gap-4">
        <span className="h-px flex-1 bg-gold/15" />
        <span className="text-[10px] uppercase tracking-widest2 text-bone/40">o</span>
        <span className="h-px flex-1 bg-gold/15" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="btn-outline flex w-full items-center justify-center gap-3 disabled:opacity-50"
      >
        {googleLoading ? <FaSpinner className="animate-spin" /> : <FaGoogle />}
        Continuar con Google
      </button>
    </AuthShell>
  );
}
