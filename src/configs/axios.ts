import axios, { type InternalAxiosRequestConfig } from "axios";

import { donDuLieuPhienNguoiDung } from "@/lib/donDuLieuPhien";

const SESSION_KEY = "solodesk.auth.session.v1";
const REFRESH_KEY = "solodesk.auth.refresh.v1";

// Ưu tiên localStorage để các tab trong cùng browser gọi API bằng cùng một tài khoản.
const STORAGES = [localStorage, sessionStorage];

function getStoredToken(): string | null {
  for (const s of STORAGES) {
    try {
      const raw = s.getItem(SESSION_KEY);
      if (raw) return (JSON.parse(raw) as { token?: string }).token ?? null;
    } catch { /* ignore */ }
  }
  return null;
}

function getStoredRefreshToken(): string | null {
  for (const s of STORAGES) {
    try {
      const val = s.getItem(REFRESH_KEY);
      if (val) return val;
    } catch { /* ignore */ }
  }
  return null;
}

function updateStoredTokens(accessToken: string, refreshToken: string): void {
  for (const s of STORAGES) {
    try {
      const raw = s.getItem(SESSION_KEY);
      if (!raw) continue;
      const session = JSON.parse(raw) as Record<string, unknown>;
      session.token = accessToken;
      s.setItem(SESSION_KEY, JSON.stringify(session));
      s.setItem(REFRESH_KEY, refreshToken);
      break;
    } catch { /* ignore */ }
  }
}

function clearSession(): void {
  for (const s of STORAGES) {
    s.removeItem(SESSION_KEY);
    s.removeItem(REFRESH_KEY);
  }
  // Hết phiên cũng phải dọn dữ liệu tài khoản, không chỉ hai khoá token: máy dùng chung
  // thì người đăng nhập kế tiếp sẽ thấy bản nháp hồ sơ và tên khách của người trước.  #Huynh
  donDuLieuPhienNguoiDung();
}

/**
 * Trang công khai của freelancer — người xem là KHÁCH của họ, không có tài khoản SoloDesk.
 *
 * Có lỗi 401 lọt ra ở đây thì đá họ về màn đăng nhập của hệ thống là vô nghĩa: họ không có
 * gì để đăng nhập, và màn hình vừa nhảy đi trông y như hệ thống hỏng.  #Huynh
 */
const PUBLIC_PATH_PREFIXES = ["/intake/", "/ho-so/", "/bieu-mau/"];

/**
 * Phiên hết hạn: dọn phiên rồi đưa về màn đăng nhập, KÈM LÝ DO.
 *
 * Trước đây chỉ `window.location.href = "/login"` trần trụi — freelancer đang gõ dở nội dung
 * hoá đơn thì màn hình nhảy đi, không một chữ giải thích, bản nháp mất sạch (đây là reload
 * cứng nên state React không còn gì). `reason=expired` để màn đăng nhập nói được vì sao họ
 * bị đưa về đây.  #Huynh
 */
function handleSessionExpired(): void {
  const hadSession = getStoredToken() !== null || getStoredRefreshToken() !== null;
  clearSession();

  // Chưa từng đăng nhập thì cũng chẳng có phiên nào "hết hạn" — đừng đá đi đâu cả. Bắt luôn
  // trường hợp khách đang xem hồ sơ công khai ở đường dẫn gốc (`/<slug>`).
  if (!hadSession) return;

  const path = window.location.pathname || "";
  if (path.startsWith("/login")) return;
  if (PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return;

  window.location.href = "/login?reason=expired";
}

// ── Axios instance ─────────────────────────────────────────────────────────

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  timeout: 15000,
});

axiosClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Refresh token interceptor ──────────────────────────────────────────────
// On 401: try POST /auth/refresh once. If it succeeds, retry the original
// request with the new access token. If it fails, clear session + redirect.

type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void };

// Auth endpoints must never go through refresh-retry: a 401 here means bad
// credentials / invalid refresh token, not an expired access token. Letting
// them in causes /auth/refresh to re-enter this interceptor and deadlock.
/**
 * Các endpoint mà 401 KHÔNG có nghĩa là "access token hết hạn".
 *
 * Chúng là endpoint không cần đăng nhập: 401 ở đây nghĩa là sai thông tin xác thực
 * (sai mật khẩu, sai/hết hạn mã OTP, id_token Google không hợp lệ). Nếu không liệt
 * kê ở đây, interceptor bên dưới sẽ tưởng nhầm là token hết hạn → đi refresh →
 * không có refresh token → xoá phiên và đá người dùng về /login.
 *
 * Cụ thể đã gặp: gõ SAI mã OTP ở màn Quên mật khẩu → bị văng thẳng về trang đăng
 * nhập, không hiện lỗi gì, người dùng không hiểu chuyện gì vừa xảy ra.
 */
const AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/google",
  "/auth/password-reset",
];

function isAuthPath(url?: string): boolean {
  return !!url && AUTH_PATHS.some((p) => url.includes(p));
}

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: { config: InternalAxiosRequestConfig & { _retry?: boolean }; response?: { status: number } }) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry || isAuthPath(originalRequest.url)) {
      return Promise.reject(error);
    }

    // Queue subsequent 401s while a refresh is in flight
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = getStoredRefreshToken();

    if (!refreshToken) {
      isRefreshing = false;
      handleSessionExpired();
      return Promise.reject(error);
    }

    try {
      const { data } = await axiosClient.post<{
        data: { access_token: string; refresh_token: string };
      }>("/auth/refresh", { refresh_token: refreshToken });

      const { access_token, refresh_token } = data.data;
      updateStoredTokens(access_token, refresh_token);
      processQueue(null, access_token);
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      handleSessionExpired();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosClient;
