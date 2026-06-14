import axios, { type InternalAxiosRequestConfig } from "axios";

const SESSION_KEY = "solodesk.auth.session.v1";
const REFRESH_KEY = "solodesk.auth.refresh.v1";

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
}

// ── Axios instance ─────────────────────────────────────────────────────────

export function getBaseURL(): string {
  const raw = (import.meta.env.VITE_API_URL || "http://localhost:8000").trim();
  const cleanRaw = raw.replace(/\/+$/, "");
  if (/\/api\/v\d+$/.test(cleanRaw)) {
    return cleanRaw;
  }
  return `${cleanRaw}/api/v1`;
}

const axiosClient = axios.create({
  baseURL: "/api/v1",
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
const AUTH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

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
      clearSession();
      window.location.href = "/login";
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
      clearSession();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosClient;
