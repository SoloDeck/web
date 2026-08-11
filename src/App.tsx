import { useEffect } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { useConfigStore } from "@/features/auth/hooks/useConfigStore";

const router = getRouter();

/**
 * Cấu hình vẫn nạp lúc khởi động, nhưng KHÔNG chặn app render nữa.
 *
 * `ClientConfig` chỉ có hai trường: `app_env` (không nơi nào đọc) và `google_web_client_id`
 * (chỉ `GoogleButton` đọc, và nó đã tự xử lý được khi thiếu — tắt đăng nhập Google, hiện
 * skeleton). Vậy mà bản cũ dựng màn chờ rồi màn lỗi che TOÀN BỘ ứng dụng cho tới khi lấy
 * được nó.
 *
 * Hậu quả: backend trục trặc là cả trang giới thiệu, trang hồ sơ công khai và mọi biểu mẫu
 * chia sẻ đều tối đen với dòng "Lỗi tải cấu hình" — những trang không cần backend một chút
 * nào. Đây cũng chính là thứ làm CI đỏ: job e2e chạy không có backend, nên `/auth/config`
 * hỏng và trang `/home` không bao giờ dựng ra nổi cái `<h1>`.
 *
 * Lỗi vẫn được lưu trong store; chỗ duy nhất thật sự chịu ảnh hưởng là nút Google, và nó
 * đã báo bằng trạng thái của chính nó.  #Huynh
 */
function App() {
  const fetchConfig = useConfigStore((s) => s.fetchConfig);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return <RouterProvider router={router} />;
}

export default App;

