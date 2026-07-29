import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import AuthShell from "../../components/club/AuthShell";
import { useAuth } from "../../auth/useAuth";
import { fieldClass } from "../../lib/ui";

const MIN_PASSWORD_LENGTH = 6;

/** Destino del enlace de recuperación. Supabase ya dejó una sesión de
 * recuperación activa al abrir el enlace, así que aquí solo se pide la
 * contraseña nueva. */
export default function ResetPassword() {
  const { updatePassword, isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);

    if (updateError) {
      setError(updateError);
      return;
    }
    navigate("/club", { replace: true });
  };

  const linkExpired = !initializing && !isAuthenticated;

  return (
    <AuthShell
      eyebrow="Red Club"
      title="Nueva contraseña"
      subtitle={linkExpired ? undefined : "Elige una contraseña nueva para tu cuenta."}
      footer={
        <Link to="/club/entrar" className="text-gold transition-colors hover:text-gold-light">
          Volver a iniciar sesión
        </Link>
      }
    >
      {linkExpired ? (
        <p className="flex items-center gap-2 text-sm text-blood">
          <FaExclamationTriangle className="shrink-0" /> El enlace no es válido o ya expiró.
          Solicita uno nuevo desde "¿Olvidaste tu contraseña?".
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            required
            type="password"
            autoComplete="new-password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
          <input
            required
            type="password"
            autoComplete="new-password"
            placeholder="Confirma la contraseña"
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
                <FaSpinner className="animate-spin" /> Guardando...
              </>
            ) : (
              "Guardar contraseña"
            )}
          </button>
          {error && (
            <p className="flex items-center gap-2 text-sm text-blood">
              <FaExclamationTriangle className="shrink-0" /> {error}
            </p>
          )}
        </form>
      )}
    </AuthShell>
  );
}
