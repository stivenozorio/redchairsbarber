import { useState, type FormEvent } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaLock, FaSpinner } from "react-icons/fa";
import { useAuth } from "../../auth/useAuth";
import { fieldClass, labelClass } from "../../lib/ui";

const MIN_PASSWORD_LENGTH = 6;

/** Cambiar contraseña sin salir de "Mi cuenta". Solo tiene sentido para
 * quienes se registraron con correo y contraseña — alguien que entra
 * con Google no tiene una contraseña propia en el sitio, así que el
 * botón ni aparece para esas cuentas. */
export default function ChangePasswordForm() {
  const { user, updatePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (user?.app_metadata?.provider !== "email") return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await updatePassword(password);
    setSaving(false);

    if (updateError) {
      setError(updateError);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setOpen(false);
    setSaved(true);
  };

  return (
    <div className="mt-6 border-t border-gold/10 pt-6">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setSaved(false);
            setOpen(true);
          }}
          className="btn-outline flex w-full items-center justify-center gap-2"
        >
          <FaLock size={12} /> Cambiar contraseña
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass} htmlFor="change-password-new">
              <FaLock size={11} /> Nueva contraseña
            </label>
            <input
              id="change-password-new"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="change-password-confirm">
              <FaLock size={11} /> Confirma la contraseña
            </label>
            <input
              id="change-password-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="btn-gold flex flex-1 items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <FaSpinner className="animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar contraseña"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
                setPassword("");
                setConfirmPassword("");
              }}
              className="btn-outline"
            >
              Cancelar
            </button>
          </div>
          {error && (
            <p className="flex items-center gap-2 text-sm text-blood">
              <FaExclamationTriangle className="shrink-0" /> {error}
            </p>
          )}
        </form>
      )}

      {saved && (
        <p className="mt-4 flex items-center gap-2 text-sm text-gold">
          <FaCheckCircle /> Contraseña actualizada.
        </p>
      )}
    </div>
  );
}
