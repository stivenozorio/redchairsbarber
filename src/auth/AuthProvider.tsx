import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types/club";
import { AuthContext, type AuthContextValue, type AuthResult, type SignUpData } from "./authContext";

/** Traduce los errores de Supabase (en inglés y a veces crípticos) a
 * mensajes que un cliente de la barbería pueda entender. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Debes confirmar tu correo antes de iniciar sesión.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Ya existe una cuenta con este correo. Inicia sesión.";
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "El correo no es válido.";
  if (m.includes("for security purposes") || m.includes("rate limit"))
    return "Demasiados intentos. Espera unos segundos e intenta de nuevo.";
  return message;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Restaura la sesión guardada y escucha cambios (login, logout,
  // refresco de token, retorno del OAuth de Google).
  useEffect(() => {
    if (!supabase) {
      setInitializing(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setInitializing(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Solo estado síncrono aquí. Consultar la base dentro de este
      // callback puede bloquear el cliente de Supabase; el perfil se
      // carga en el efecto de abajo.
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setInitializing(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    setProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("No se pudo cargar el perfil:", error.message);
      setProfile(null);
    } else {
      setProfile((data as Profile) ?? null);
    }
    setProfileLoading(false);
    return (data as Profile) ?? null;
  }, []);

  /** Completa el perfil con lo que entrega el proveedor (Google), sin
   * pisar nada que el cliente haya editado a mano: solo rellena campos
   * vacíos. El avatar sí se mantiene sincronizado porque no es editable
   * desde la aplicación. */
  const syncProfileFromProvider = useCallback(
    async (currentUser: User, currentProfile: Profile | null) => {
      if (!supabase || !currentProfile) return;

      const meta = currentUser.user_metadata ?? {};
      const providerName =
        (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null;
      const providerAvatar =
        (meta.avatar_url as string | undefined) ?? (meta.picture as string | undefined) ?? null;

      const updates: Record<string, string> = {};

      if (!currentProfile.full_name?.trim() && providerName) {
        updates.full_name = providerName;
      }
      if (providerAvatar && providerAvatar !== currentProfile.avatar_url) {
        updates.avatar_url = providerAvatar;
      }
      if (!currentProfile.email && currentUser.email) {
        updates.email = currentUser.email;
      }

      if (Object.keys(updates).length === 0) return;

      const { error } = await supabase.from("profiles").update(updates).eq("id", currentUser.id);
      if (error) {
        console.error("No se pudo sincronizar el perfil con el proveedor:", error.message);
        return;
      }
      await loadProfile(currentUser.id);
    },
    [loadProfile]
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    void loadProfile(user.id).then((loaded) => {
      if (loaded) void syncProfileFromProvider(user, loaded);
    });
  }, [user, loadProfile, syncProfileFromProvider]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const signUp = useCallback(async (data: SignUpData): Promise<AuthResult> => {
    if (!supabase) return { error: "El sistema de cuentas no está disponible." };

    const { data: result, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        // Los lee el trigger handle_new_user para crear el perfil.
        data: { full_name: data.fullName.trim(), phone: data.phone.trim() },
        emailRedirectTo: `${window.location.origin}/club/callback`,
      },
    });

    if (error) return { error: translateAuthError(error.message) };

    // Sin sesión inmediata = Supabase está exigiendo confirmar el correo.
    return { error: null, needsEmailConfirmation: !result.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "El sistema de cuentas no está disponible." };
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error ? translateAuthError(error.message) : null };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!supabase) return { error: "El sistema de cuentas no está disponible." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/club/callback` },
    });
    return { error: error ? translateAuthError(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { error: "El sistema de cuentas no está disponible." };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/club/restablecer`,
    });
    return { error: error ? translateAuthError(error.message) : null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    if (!supabase) return { error: "El sistema de cuentas no está disponible." };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error ? translateAuthError(error.message) : null };
  }, []);

  const updateProfile = useCallback(
    async (
      fields: Partial<Pick<Profile, "full_name" | "phone" | "birthday" | "phone_prompt_dismissed">>
    ): Promise<AuthResult> => {
      if (!supabase || !user) return { error: "No has iniciado sesión." };
      const { error } = await supabase.from("profiles").update(fields).eq("id", user.id);
      if (error) return { error: error.message };
      await loadProfile(user.id);
      return { error: null };
    },
    [user, loadProfile]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      initializing,
      session,
      user,
      profile,
      profileLoading,
      isAuthenticated: Boolean(user),
      isStaff: profile?.role === "barber" || profile?.role === "admin",
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      requestPasswordReset,
      updatePassword,
      updateProfile,
      refreshProfile,
    }),
    [
      initializing,
      session,
      user,
      profile,
      profileLoading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      requestPasswordReset,
      updatePassword,
      updateProfile,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
