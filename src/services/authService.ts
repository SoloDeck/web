import type {
  ApiAuthResponse,
  ApiResponse,
  AuthSession,
  LoginCredentials,
  RegisterPayload,
  User,
} from "@/features/auth/types";
import axiosClient from "@/configs/axios";

// ---------------------------------------------------------------------------
// Auth service
//
// Calls the FastAPI backend for login / register. Google OAuth and token
// refresh endpoints are commented out on the backend side — those paths keep
// a local mock until the server implements them.
//
// Swapping any individual function to a real endpoint only requires editing
// this file; the Zustand store and all UI components are untouched.
// ---------------------------------------------------------------------------

const SESSION_KEY = "solodesk.auth.session.v1";
const REFRESH_KEY  = "solodesk.auth.refresh.v1";

// ── Demo credential hints (displayed in LoginForm; users must exist in DB) ───

export const DEMO_CREDENTIALS = [
  { label: "Admin",      email: "admin@gmail.com",      password: "123456" },
  { label: "Freelancer", email: "freelancer@gmail.com", password: "123456" },
];

// ── JWT helpers ──────────────────────────────────────────────────────────────

type JwtClaims = { sub: string; email: string; role?: string };

function parseJwtPayload(token: string): JwtClaims {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64)) as JwtClaims;
}

// ── Session mapping ──────────────────────────────────────────────────────────

function toSession(res: ApiAuthResponse): AuthSession {
  const claims = parseJwtPayload(res.access_token);
  localStorage.setItem(REFRESH_KEY, res.refresh_token);
  const user: User = {
    id:       claims.sub,
    fullName: claims.email,   // /users/me not yet implemented → use email as fallback
    email:    claims.email,
  };
  return { token: res.access_token, user };
}

function persistSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// ── Public helpers ────────────────────────────────────────────────────────────

/** The current persisted session, if any. Read synchronously at store init.
 *  Automatically clears stale mock tokens and expired JWTs. */
export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.token) return null;

    // Validate token is a real JWT and not expired
    try {
      const claims = parseJwtPayload(session.token);
      if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(REFRESH_KEY);
        return null;
      }
    } catch {
      // Token không phải JWT hợp lệ (ví dụ: mock token cũ) → xóa
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REFRESH_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
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

// ── Auth calls ───────────────────────────────────────────────────────────────

/** Maps to `POST /auth/login`. */
export async function login(creds: LoginCredentials): Promise<AuthSession> {
  try {
    const { data } = await axiosClient.post<ApiResponse<ApiAuthResponse>>("/auth/login", creds);
    const session = toSession(data.data);
    persistSession(session);
    return session;
  } catch (err) {
    throw toVietnameseError(err);
  }
}

/** Maps to `POST /auth/register`. */
export async function register(payload: RegisterPayload): Promise<AuthSession> {
  try {
    const { data } = await axiosClient.post<ApiResponse<ApiAuthResponse>>("/auth/register", {
      full_name: payload.fullName,   // backend uses snake_case
      email:     payload.email,
      password:  payload.password,
    });
    const session = toSession(data.data);
    persistSession(session);
    return session;
  } catch (err) {
    throw toVietnameseError(err);
  }
}

/**
 * Google OAuth — backend endpoint still commented out.
 * Keeps a local mock until the server implements /auth/google.
 */
export async function loginWithGoogle(): Promise<AuthSession> {
  throw new Error("Đăng nhập Google chưa được hỗ trợ. Vui lòng dùng email.");
}

/**
 * Maps to `POST /auth/forgot-password`. Always resolves successfully so the
 * response never reveals whether an email is registered.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  // await axiosClient.post("/auth/forgot-password", { email });
  void email;
}

/** Maps to `POST /auth/logout`. Clears local session regardless of API result. */
export async function logout(): Promise<void> {
  try {
    await axiosClient.post("/auth/logout");
  } catch {
    /* best-effort — always clear local state */
  } finally {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}
