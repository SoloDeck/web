import { create } from "zustand";
import type {
  LoginCredentials,
  RegisterPayload,
  User,
} from "@/features/auth/types";
import * as authService from "@/services/authService";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  error: string | null;
  login: (creds: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const initialSession = authService.getStoredSession();

export const useAuthStore = create<AuthState>((set) => {
  /** Run an async auth call, mirroring its result into the store. */
  const run = async (fn: () => Promise<Awaited<ReturnType<typeof authService.login>>>) => {
    set({ isSubmitting: true, error: null });
    try {
      const session = await fn();
      set({
        user: session.user,
        token: session.token,
        isAuthenticated: true,
        isSubmitting: false,
        error: null,
      });
    } catch (e) {
      set({ isSubmitting: false, error: e instanceof Error ? e.message : "Đã có lỗi xảy ra." });
      throw e;
    }
  };

  return {
    user: initialSession?.user ?? null,
    token: initialSession?.token ?? null,
    isAuthenticated: Boolean(initialSession),
    isSubmitting: false,
    error: null,

    login: (creds) => run(() => authService.login(creds)),
    register: (payload) => run(() => authService.register(payload)),
    loginWithGoogle: () => run(() => authService.loginWithGoogle()),

    logout: async () => {
      await authService.logout();
      set({ user: null, token: null, isAuthenticated: false, error: null });
    },

    clearError: () => set({ error: null }),
  };
});
