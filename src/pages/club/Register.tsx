import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaExclamationTriangle, FaGoogle, FaSpinner } from "react-icons/fa";
import AuthShell from "../../components/club/AuthShell";
import { useAuth } from "../../auth/useAuth";
import { fieldClass } from "../../lib/ui";

const MIN_PASSWORD_LENGTH = 6;

export default function Register() {
  const { signUp, signInWithGoogle, isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Si llegó redirigido desde una ruta protegida (p. ej. /reservar
  // exige cuenta — ver ProtectedRoute), vuelve ahí después de
  // registrarse en vez de mandarlo siempre a "Mi cuenta".
  const from = (location.state as { from?: string } | null)?.from ?? "/club";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  if (!initializing && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    const result = await signUp({ email, password, fullName, phone });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setConfirmationSent(true);
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
  };

  if (confirmationSent) {
    return (
      <AuthShell
        eyebrow="Casi listo"
        title="Confirma tu correo"
        subtitle={`Te enviamos un enlace de confirmación a ${email}. Ábrelo para activar tu cuenta de RED CLUB.`}
        footer={
          <Link to="/club/entrar" className="text-gold transition-colors hover:text-gold-light">
            Volver a iniciar sesión
          </Link>
        }
      >
        <p className="flex items-center justify-center gap-2 text-sm text-gold">
          <FaCheckCircle /> Correo enviado
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Red Club"
      title="Crear cuenta"
      subtitle="Únete a RED CLUB y lleva el control de tus citas."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link to="/club/entrar" className="text-gold transition-colors hover:text-gold-light">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          required
          type="text"
          autoComplete="name"
          placeholder="Tu nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={fieldClass}
        />
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
          type="tel"
          autoComplete="tel"
          placeholder="Tu teléfono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={fieldClass}
        />
        <input
          required
          type="password"
          autoComplete="new-password"
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
        <input
          required
          type="password"
          autoComplete="new-password"
          placeholder="Confirma tu contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={fieldClass}
        />

        <button
          type="submit"
          disabled={submitting}
          className="btn-gold flex w-full items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <FaSpinner className="animate-spin" /> Creando tu cuenta...
            </>
          ) : (
            "Crear cuenta"
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
