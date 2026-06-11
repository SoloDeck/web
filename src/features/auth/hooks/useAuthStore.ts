import { create } from "zustand";
import type {
  LoginCredentials,
  RegisterPayload,
  User,
} from "@/features/auth/types";
import * as authService from "@/services/authService";
import { getMe } from "@/services/usersService";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  error: string | null;
  login: (creds: LoginCredentials, rememberMe?: boolean) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  handleGoogleCallback: (code: string, state: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  /** Refresh user name/avatar from /users/me without a full re-auth. */
  hydrate: () => Promise<void>;
  /** Patch the in-store user object (e.g. after a profile update). */
  updateUser: (partial: Partial<User>) => void;
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

    login: (creds, rememberMe = false) => run(() => authService.login(creds, rememberMe)),
    register: (payload) => run(() => authService.register(payload)),
    loginWithGoogle: () => run(() => authService.loginWithGoogle()),
    handleGoogleCallback: (code, state) => run(() => authService.handleGoogleCallback(code, state)),

    logout: async () => {
      await authService.logout();
      set({ user: null, token: null, isAuthenticated: false, error: null });
    },

    clearError: () => set({ error: null }),

    hydrate: async () => {
      try {
        const me = await getMe();
        set((state) => ({
          user: state.user
            ? { ...state.user, fullName: me.full_name, avatarUrl: me.avatar_url ?? undefined }
            : null,
        }));
      } catch {
        // silent — user may not be authenticated yet
      }
    },

    updateUser: (partial) => {
      set((state) => ({
        user: state.user ? { ...state.user, ...partial } : null,
      }));
    },
  };
});
