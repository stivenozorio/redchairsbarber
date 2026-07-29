import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "../types/club";

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export interface AuthResult {
  error: string | null;
  /** true cuando Supabase creó la cuenta pero exige confirmar el correo
   * antes de iniciar sesión. */
  needsEmailConfirmation?: boolean;
}

export interface AuthContextValue {
  /** false mientras se restaura la sesión guardada. Evita el parpadeo
   * de "no has iniciado sesión" al recargar. */
  initializing: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** El perfil aún se está cargando (la sesión ya existe). */
  profileLoading: boolean;
  isAuthenticated: boolean;
  isStaff: boolean;

  signUp: (data: SignUpData) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  updateProfile: (
    fields: Partial<
      Pick<Profile, "full_name" | "phone" | "birthday" | "phone_prompt_dismissed">
    >
  ) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
