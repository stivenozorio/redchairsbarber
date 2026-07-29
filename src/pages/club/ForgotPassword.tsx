import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FaCheckCircle, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import AuthShell from "../../components/club/AuthShell";
import { useAuth } from "../../auth/useAuth";
import { fieldClass } from "../../lib/ui";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: resetError } = await requestPasswordReset(email);
    setSubmitting(false);
    if (resetError) {
      setError(resetError);
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      eyebrow="Red Club"
      title="Recuperar contraseña"
      subtitle={
        sent
          ? undefined
          : "Te enviaremos un enlace para crear una contraseña nueva."
      }
      footer={
        <Link to="/club/entrar" className="text-gold transition-colors hover:text-gold-light">
          Volver a iniciar sesión
        </Link>
      }
    >
      {sent ? (
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 text-sm text-gold">
            <FaCheckCircle /> Enlace enviado
          </p>
          <p className="mt-3 text-sm leading-relaxed text-bone/70">
            Si existe una cuenta con <span className="text-ivory">{email}</span>, recibirás un
            correo con las instrucciones.
          </p>
        </div>
      ) : (
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
          <button
            type="submit"
            disabled={submitting}
            className="btn-gold flex w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <FaSpinner className="animate-spin" /> Enviando...
              </>
            ) : (
              "Enviar enlace"
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
