/**
 * authService.ts
 *
 * Xử lý toàn bộ luồng xác thực: đăng nhập email, đăng ký, đăng nhập Google OAuth,
 * làm mới token, và đăng xuất. Giao tiếp trực tiếp với backend qua axiosClient.
 *
 * Luồng Google OAuth (backend-driven):
 *   1. Người dùng bấm "Đăng nhập Google"
 *   2. `loginWithGoogle()` chuyển hướng browser đến `GET /auth/google` (backend)
 *   3. Backend sinh JWT state (hết hạn 10 phút), tạo URL Google OAuth và redirect
 *   4. Người dùng đăng nhập trên trang Google
 *   5. Google redirect về `localhost:5173/auth/google-callback?code=...&state=...`
 *   6. Trang callback gọi `handleGoogleCallback(code, state)`
 *   7. Backend xác minh JWT state, đổi code lấy id_token từ Google
 *   8. Backend xác minh id_token, upsert user, trả về access_token + refresh_token
 *   9. Frontend lưu session và chuyển về trang chủ
 */

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

// ── Khóa lưu trữ trong localStorage / sessionStorage ─────────────────────────

const SESSION_KEY = "solodesk.auth.session.v1";  // lưu thông tin user + access token
const REFRESH_KEY = "solodesk.auth.refresh.v1";  // lưu refresh token riêng

// ── Giải mã JWT ───────────────────────────────────────────────────────────────

type JwtClaims = { sub: string; email: string; role?: string; exp?: number };

/** Giải mã phần payload của JWT (không cần xác minh chữ ký — chỉ đọc claims). */
function parseJwtPayload(token: string): JwtClaims {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64)) as JwtClaims;
}

// ── Quản lý session ───────────────────────────────────────────────────────────

/** Chuyển response API thành AuthSession nội bộ (dùng JWT claims để lấy thông tin user). */
function toSession(res: ApiAuthResponse): AuthSession {
  const claims = parseJwtPayload(res.access_token);
  const user: User = {
    id: claims.sub,
    fullName: claims.email, // sẽ được thay bằng full_name thực qua enrichSession
    email: claims.email,
  };
  return { token: res.access_token, user };
}

/**
 * Lưu session vào storage.
 * - rememberMe = true  → localStorage  (giữ qua các lần mở trình duyệt, tự refresh token)
 * - rememberMe = false → sessionStorage (xóa khi đóng tab)
 */
function persistSession(session: AuthSession, rememberMe: boolean, refreshToken: string): void {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  storage.setItem(REFRESH_KEY, refreshToken);
}

/**
 * Đọc session từ localStorage hoặc sessionStorage.
 * Bỏ qua token đã hết hạn (để axios interceptor xử lý refresh sau).
 * Trả về null nếu không có session hợp lệ.
 */
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
          // Token hết hạn — giữ lại để axios interceptor dùng refresh token
          continue;
        }
      } catch {
        // Token bị hỏng — xóa luôn
        storage.removeItem(SESSION_KEY);
        storage.removeItem(REFRESH_KEY);
        continue;
      }

      return session;
    } catch { /* bỏ qua lỗi parse */ }
  }
  return null;
}

/** Lấy access token hiện tại (dùng trong axios interceptor). */
export function getToken(): string | null {
  return getStoredSession()?.token ?? null;
}

// ── Xử lý lỗi ────────────────────────────────────────────────────────────────

/** Bảng ánh xạ HTTP status → thông báo lỗi tiếng Việt cho luồng email/mật khẩu. */
const STATUS_MESSAGES: Record<number, string> = {
  401: "Email hoặc mật khẩu không đúng.",
  409: "Email này đã được đăng ký.",
  422: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  429: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
  500: "Lỗi máy chủ. Vui lòng thử lại sau.",
};

/** Chuyển lỗi axios thành Error tiếng Việt dễ hiển thị trên UI. */
function toVietnameseError(err: unknown): Error {
  const axiosErr = err as { response?: { status?: number; data?: { message?: string; detail?: string } } };
  const status = axiosErr.response?.status;
  // Ưu tiên message từ backend, fallback về bảng cứng, cuối cùng mới dùng thông báo mặc định
  const backendMsg = axiosErr.response?.data?.message ?? axiosErr.response?.data?.detail;
  const msg = STATUS_MESSAGES[status ?? 0] ?? backendMsg ?? "Đã có lỗi xảy ra. Vui lòng thử lại.";
  return new Error(msg);
}

// ── Các hàm gọi API xác thực ──────────────────────────────────────────────────

/**
 * Lấy thông tin đầy đủ từ `GET /users/me` và cập nhật vào session đang lưu.
 * Chạy sau mỗi lần đăng nhập để có full_name và avatar_url thực sự từ DB.
 * Nếu gọi thất bại thì giữ nguyên email làm fallback.
 */
async function enrichSession(
  session: AuthSession,
  rememberMe: boolean,
  refreshToken: string,
): Promise<AuthSession> {
  try {
    const me = await getMe();
    session.user.fullName = me.full_name;
    if (me.avatar_url) session.user.avatarUrl = me.avatar_url;
    persistSession(session, rememberMe, refreshToken);
  } catch {
    // Giữ email làm fallback nếu /users/me thất bại
  }
  return session;
}

/**
 * Đăng nhập bằng email và mật khẩu.
 * Maps to `POST /auth/login`
 *
 * @param rememberMe true → lưu vào localStorage (giữ qua lần mở lại trình duyệt)
 *                   false → lưu vào sessionStorage (mất khi đóng tab)
 */
export async function login(creds: LoginCredentials, rememberMe = false): Promise<AuthSession> {
  try {
    const { data } = await axiosClient.post<ApiResponse<ApiAuthResponse>>("/auth/login", creds);
    const session = toSession(data.data);
    persistSession(session, rememberMe, data.data.refresh_token);
    // Bổ sung full_name và avatar từ /users/me sau khi đăng nhập
    return enrichSession(session, rememberMe, data.data.refresh_token);
  } catch (err) {
    throw toVietnameseError(err);
  }
}

/**
 * Đăng ký tài khoản mới.
 * Maps to `POST /auth/register`
 * Luôn lưu vào localStorage (người dùng mới nên giữ đăng nhập).
 */
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

/**
 * Bắt đầu luồng đăng nhập Google OAuth (backend-driven redirect).
 * Maps to `GET /auth/google`
 *
 * Backend sẽ:
 *   1. Sinh JWT state (hết hạn 10 phút, dùng để chống CSRF)
 *   2. Build URL Google OAuth và redirect browser đến Google
 *
 * Hàm này **không bao giờ resolve** — browser chuyển hướng sang trang khác ngay.
 * Promise trả về chỉ để tương thích với kiểu AuthSession của useAuthStore.
 */
export async function loginWithGoogle(): Promise<AuthSession> {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000/api/v1";
  // Chuyển hướng browser đến backend — từ đây backend lo phần còn lại
  window.location.href = `${base}/auth/google`;
  // Promise này không bao giờ resolve vì browser đã navigate ra ngoài
  return new Promise(() => {});
}

/**
 * Xử lý callback sau khi Google redirect về frontend.
 * Maps to `GET /auth/google/callback?code=...&state=...`
 *
 * Backend sẽ:
 *   1. Xác minh JWT state (chống CSRF, hết hạn sau 10 phút kể từ bước redirect)
 *   2. Gửi code lên Google để đổi lấy id_token
 *   3. Xác minh id_token, upsert user (tạo mới nếu chưa có, liên kết nếu email đã tồn tại)
 *   4. Trả về access_token + refresh_token
 *
 * Lỗi 401/400 = state hết hạn (> 10 phút) hoặc code đã bị dùng → yêu cầu đăng nhập lại.
 * Gọi từ route `/auth/google-callback` sau khi Google redirect về.
 */
export async function handleGoogleCallback(code: string, state: string): Promise<AuthSession> {
  try {
    const { data } = await axiosClient.get<ApiResponse<ApiAuthResponse>>("/auth/google/callback", {
      params: { code, state },
    });
    const session = toSession(data.data);
    // Google login luôn lưu vào localStorage (giữ đăng nhập lâu dài)
    persistSession(session, true, data.data.refresh_token);
    return enrichSession(session, true, data.data.refresh_token);
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status;
    // 401 hoặc 400 = state JWT hết hạn / code đã dùng → không phải lỗi email/mật khẩu
    if (status === 401 || status === 400) {
      throw new Error("Xác thực Google thất bại. Vui lòng thử lại.");
    }
    throw toVietnameseError(err);
  }
}

/**
 * Yêu cầu gửi OTP đặt lại mật khẩu qua email.
 * Maps to `POST /auth/password-reset/request`
 * TODO: Chưa triển khai UI — đang để trống.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await axiosClient.post("/auth/password-reset/request", { email });
}

/**
 * Đăng xuất — gọi API để blacklist token hiện tại, sau đó xóa session khỏi storage.
 * Maps to `POST /auth/logout`
 * Luôn xóa storage dù API có thất bại (best-effort).
 */
export async function logout(): Promise<void> {
  try {
    await axiosClient.post("/auth/logout");
  } catch {
    // Bỏ qua lỗi network — vẫn xóa session phía client
  } finally {
    // Xóa session ở cả hai storage để đảm bảo đăng xuất hoàn toàn
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(SESSION_KEY);
      storage.removeItem(REFRESH_KEY);
    }
  }
}
