import axios from "axios";

const SESSION_KEY = "solodesk.auth.session.v1";
const REFRESH_KEY  = "solodesk.auth.refresh.v1";

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return (JSON.parse(raw) as { token?: string }).token ?? null;
  } catch { /* ignore malformed storage */ }
  return null;
}

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
  timeout: 15000,
});

axiosClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REFRESH_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
