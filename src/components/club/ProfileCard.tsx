import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  FaCheckCircle,
  FaEnvelope,
  FaExclamationTriangle,
  FaLock,
  FaPhone,
  FaSignOutAlt,
  FaSpinner,
  FaUser,
} from "react-icons/fa";
import { useAuth } from "../../auth/useAuth";
import { fieldClass, labelClass } from "../../lib/ui";

/** Datos del socio: correo de solo lectura, nombre y teléfono editables. */
export default function ProfileCard() {
  const { user, profile, profileLoading, updateProfile, signOut } = useAuth();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const email = profile?.email ?? user?.email ?? "";
  const displayName = profile?.full_name?.trim() || email;
  const avatar = profile?.avatar_url;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!fullName.trim()) {
      setError("El nombre no puede quedar vacío.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
    });
    setSaving(false);

    if (updateError) {
      setError(updateError);
      return;
    }
    setEditing(false);
    setSaved(true);
  };

  return (
    <div className="card-lux h-full">
      <p className="eyebrow justify-start before:hidden">Tus datos</p>

      {profileLoading && !profile ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-bone/60">
          <FaSpinner className="animate-spin text-gold" /> Cargando...
        </p>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-4">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                referrerPolicy="no-referrer"
                className="h-14 w-14 shrink-0 rounded-full border border-gold/30 object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-obsidian">
                <FaUser className="text-gold/70" />
              </span>
            )}
            <h2 className="font-display text-2xl leading-tight text-ivory">{displayName}</h2>
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className={labelClass} htmlFor="profile-name">
                  <FaUser size={11} /> Nombre
                </label>
                <input
                  id="profile-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="profile-phone">
                  <FaPhone size={11} /> Teléfono
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Ej. 320 392 5995"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <FaLock size={11} /> Correo (no editable)
                </label>
                <p className="break-all rounded-sm border border-gold/10 bg-obsidian/60 px-5 py-4 text-sm text-bone/50">
                  {email}
                </p>
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
                    "Guardar cambios"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
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
          ) : (
            <>
              <ul className="mt-8 space-y-5">
                <li className="flex items-start gap-4">
                  <FaUser className="mt-1 shrink-0 text-gold/70" size={14} />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest2 text-bone/40">Nombre</p>
                    <p className="mt-1 text-sm text-ivory/90">
                      {profile?.full_name ?? "Sin registrar"}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <FaEnvelope className="mt-1 shrink-0 text-gold/70" size={14} />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest2 text-bone/40">Correo</p>
                    <p className="mt-1 break-all text-sm text-ivory/90">{email || "Sin registrar"}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <FaPhone className="mt-1 shrink-0 text-gold/70" size={14} />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest2 text-bone/40">Teléfono</p>
                    <p className="mt-1 text-sm text-ivory/90">
                      {profile?.phone?.trim() || "Sin registrar"}
                    </p>
                  </div>
                </li>
              </ul>

              {saved && (
                <p className="mt-6 flex items-center gap-2 text-sm text-gold">
                  <FaCheckCircle /> Datos actualizados.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setSaved(false);
                }}
                className="btn-outline mt-8 w-full"
              >
                Editar datos
              </button>
            </>
          )}

          <div className="mt-6 space-y-3 border-t border-gold/10 pt-8">
            <Link to="/reservar" className="btn-gold w-full">
              Reservar una cita
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="btn-outline flex w-full items-center justify-center gap-2"
            >
              <FaSignOutAlt size={12} /> Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}
