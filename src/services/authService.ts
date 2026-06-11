import type {
  ApiAuthResponse,
  ApiResponse,
  AuthSession,
  LoginCredentials,
  RegisterPayload,
  User,
} from "@/features/auth/types";
import axiosClient from "@/configs/axios";
import { getMe } from "@/services/usersService";

const SESSION_KEY = "solodesk.auth.session.v1";
const REFRESH_KEY = "solodesk.auth.refresh.v1";

// ── JWT helpers ───────────────────────────────────────────────────────────────

type JwtClaims = { sub: string; email: string; role?: string; exp?: number };

function parseJwtPayload(token: string): JwtClaims {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64)) as JwtClaims;
}

// ── Session storage ───────────────────────────────────────────────────────────

function toSession(res: ApiAuthResponse): AuthSession {
  const claims = parseJwtPayload(res.access_token);
  const user: User = {
    id: claims.sub,
    fullName: claims.email,
    email: claims.email,
  };
  return { token: res.access_token, user };
}

function persistSession(session: AuthSession, rememberMe: boolean, refreshToken: string): void {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  storage.setItem(REFRESH_KEY, refreshToken);
}

/** Reads session from either storage, skipping expired access tokens. */
export function getStoredSession(): AuthSession | null {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const raw = storage.getItem(SESSION_KEY);
      if (!raw) continue;
      const session = JSON.parse(raw) as AuthSession;
      if (!session?.token) continue;

      try {
        const claims = parseJwtPayload(session.token);
        if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) {
          // Expired — let the axios refresh interceptor handle it on next request;
          // don't clear here so the refresh token is still available.
          continue;
        }
      } catch {
        storage.removeItem(SESSION_KEY);
        storage.removeItem(REFRESH_KEY);
        continue;
      }

      return session;
    } catch { /* ignore */ }
  }
  return null;
}

export function getToken(): string | null {
  return getStoredSession()?.token ?? null;
}

// ── Error helpers ─────────────────────────────────────────────────────────────

const STATUS_MESSAGES: Record<number, string> = {
  401: "Email hoặc mật khẩu không đúng.",
  409: "Email này đã được đăng ký.",
  422: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  429: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
  500: "Lỗi máy chủ. Vui lòng thử lại sau.",
};

function toVietnameseError(err: unknown): Error {
  const axiosErr = err as { response?: { status?: number; data?: { message?: string; detail?: string } } };
  const status = axiosErr.response?.status;
  const backendMsg = axiosErr.response?.data?.message ?? axiosErr.response?.data?.detail;
  const msg = STATUS_MESSAGES[status ?? 0] ?? backendMsg ?? "Đã có lỗi xảy ra. Vui lòng thử lại.";
  return new Error(msg);
}

// ── Auth calls ────────────────────────────────────────────────────────────────

/** Fetches real full_name and avatarUrl from /users/me and patches them into the session. */
async function enrichSession(session: AuthSession, rememberMe: boolean, refreshToken: string): Promise<AuthSession> {
  try {
    const me = await getMe();
    session.user.fullName = me.full_name;
    if (me.avatar_url) session.user.avatarUrl = me.avatar_url;
    persistSession(session, rememberMe, refreshToken);
  } catch {
    // keep email fallback if /users/me fails
  }
  return session;
}

/** Maps to `POST /auth/login`.
 *  rememberMe=true  → localStorage  (persists across browser sessions + auto-refresh)
 *  rememberMe=false → sessionStorage (cleared when tab closes) */
export async function login(creds: LoginCredentials, rememberMe = false): Promise<AuthSession> {
  try {
    const { data } = await axiosClient.post<ApiResponse<ApiAuthResponse>>("/auth/login", creds);
    const session = toSession(data.data);
    persistSession(session, rememberMe, data.data.refresh_token);
    return enrichSession(session, rememberMe, data.data.refresh_token);
  } catch (err) {
    throw toVietnameseError(err);
  }
}

/** Maps to `POST /auth/register`. Always persists to localStorage. */
export async function register(payload: RegisterPayload): Promise<AuthSession> {
  try {
    const { data } = await axiosClient.post<ApiResponse<ApiAuthResponse>>("/auth/register", {
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
    });
    const session = toSession(data.data);
    persistSession(session, true, data.data.refresh_token);
    return enrichSession(session, true, data.data.refresh_token);
  } catch (err) {
    throw toVietnameseError(err);
  }
}

/** Initiates the Google OAuth redirect flow.
 *  Navigates the browser to the backend's /auth/google endpoint.
 *  This function intentionally never resolves — the page navigates away. */
export async function loginWithGoogle(): Promise<AuthSession> {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000/api/v1";
  window.location.href = `${base}/auth/google`;
  return new Promise(() => {}); // browser navigates away; this never settles
}

/** Exchanges the Google authorization code for application tokens.
 *  Called by the /auth/google-callback route. Always persists to localStorage. */
export async function handleGoogleCallback(code: string, state: string): Promise<AuthSession> {
  try {
    const { data } = await axiosClient.get<ApiResponse<ApiAuthResponse>>("/auth/google/callback", {
      params: { code, state },
    });
    const session = toSession(data.data);
    persistSession(session, true, data.data.refresh_token);
    return enrichSession(session, true, data.data.refresh_token);
  } catch (err) {
    throw toVietnameseError(err);
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  void email;
}

/** Maps to `POST /auth/logout`. Clears both storages regardless of API result. */
export async function logout(): Promise<void> {
  try {
    await axiosClient.post("/auth/logout");
  } catch {
    /* best-effort */
  } finally {
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(SESSION_KEY);
      storage.removeItem(REFRESH_KEY);
    }
  }
}
