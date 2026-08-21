/**
 * Google Analytics 4 — nạp CÓ ĐIỀU KIỆN, không có ID thì không làm gì.
 *
 * Không đặt ID mặc định và không cảnh báo khi thiếu: máy của người phát triển và CI đều
 * chạy không có `VITE_GA_MEASUREMENT_ID`, mà một dòng warn ở mỗi lần khởi động thì chỉ dạy
 * người ta bỏ qua console. Thiếu ID = không đo, đó là trạng thái bình thường.
 *
 * Script tải từ CDN của Google nên hàm này KHÔNG chạy được lúc dựng sẵn HTML (prerender):
 * chỉ gọi từ `main.tsx`, tức chỉ trên trình duyệt.  #Huynh
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const SCRIPT_ID = "ga4-gtag";

export function initGoogleAnalytics(): void {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  if (typeof document === "undefined") return;
  // React StrictMode dựng cây hai lần ở dev; không chặn thì gtag nạp hai bản.
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  const dataLayer: unknown[] = (window.dataLayer ??= []);
  // Chép đúng khuôn đoạn mã chính chủ của Google: đẩy `arguments` (object array-like) chứ
  // KHÔNG phải một mảng thường — gtag.js đọc từng phần tử của `dataLayer` như một danh
  // sách tham số và phân biệt hai hình dạng đó.
  const gtag: (...args: unknown[]) => void = function () {
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  };
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", measurementId);
}
