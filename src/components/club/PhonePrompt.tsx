import { useState, type FormEvent } from "react";
import { FaExclamationTriangle, FaPhone, FaSpinner } from "react-icons/fa";
import { useAuth } from "../../auth/useAuth";
import { fieldClass, labelClass } from "../../lib/ui";

/**
 * Se muestra UNA sola vez a quien entró con Google, porque Google no
 * entrega el teléfono y lo necesitamos para confirmar las citas.
 *
 * Si el cliente lo omite, se marca `phone_prompt_dismissed` y no se le
 * vuelve a pedir: siempre puede añadirlo después desde "Mis datos".
 */
export default function PhonePrompt() {
  const { profile, updateProfile } = useAuth();
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldShow =
    Boolean(profile) && !profile?.phone?.trim() && !profile?.phone_prompt_dismissed;

  if (!shouldShow) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Escribe tu número de teléfono.");
      return;
    }
    setError(null);
    setSaving(true);
    const { error: updateError } = await updateProfile({
      phone: phone.trim(),
      phone_prompt_dismissed: true,
    });
    setSaving(false);
    if (updateError) setError(updateError);
  };

  const handleDismiss = async () => {
    setDismissing(true);
    const { error: updateError } = await updateProfile({ phone_prompt_dismissed: true });
    setDismissing(false);
    if (updateError) setError(updateError);
  };

  return (
    <div className="card-lux mb-10 border-gold/40">
      <p className="eyebrow justify-start before:hidden">Completa tu perfil</p>
      <h3 className="mt-4 font-display text-xl text-ivory">Agrega tu teléfono</h3>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-bone/70">
        Lo usamos únicamente para confirmar tus citas y avisarte de cualquier cambio.
        Solo te lo pedimos esta vez.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className={labelClass} htmlFor="phone-prompt">
            <FaPhone size={11} /> Teléfono
          </label>
          <input
            id="phone-prompt"
            type="tel"
            autoComplete="tel"
            placeholder="Ej. 320 392 5995"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-gold flex items-center justify-center gap-2 !py-4 disabled:opacity-50"
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin" /> Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            className="btn-outline !py-4 disabled:opacity-50"
          >
            Ahora no
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-blood">
          <FaExclamationTriangle className="shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
