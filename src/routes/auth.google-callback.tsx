import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

/**
 * Route: /auth/google-callback
 *
 * Google OAuth redirect về đây sau khi người dùng xác nhận quyền truy cập.
 * URL sẽ có dạng: /auth/google-callback?code=...&state=...
 *   - `code`  : authorization code từ Google (dùng một lần, hết hạn ~10 phút)
 *   - `state` : JWT do backend sinh ra để chống CSRF (hết hạn 10 phút)
 *   - `error` : có mặt nếu người dùng từ chối cấp quyền trên trang Google
 *
 * Trang này chỉ hiển thị spinner — không có UI tương tác.
 * Xử lý xong sẽ tự redirect về trang chủ (thành công) hoặc trang login (thất bại).
 */
export const Route = createFileRoute("/auth/google-callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: (search.code as string) || undefined,
    state: (search.state as string) || undefined,
    error: (search.error as string) || undefined,
  }),
  component: GoogleCallbackPage,
});

// Dùng Set cấp module (không phải useRef) để tránh React Strict Mode gọi API 2 lần.
// useRef bị reset mỗi lần Strict Mode unmount/remount component, còn Set cấp module thì không.
const processedCodes = new Set<string>();

function GoogleCallbackPage() {
  const { code, state, error } = Route.useSearch();
  const navigate = useNavigate();
  const handleGoogleCallback = useAuthStore((s) => s.handleGoogleCallback);

  useEffect(() => {
    // Trường hợp người dùng từ chối cấp quyền hoặc URL thiếu params
    if (error || !code || !state) {
      toast.error("Đăng nhập Google thất bại. Vui lòng thử lại.");
      void navigate({ to: "/login" });
      return;
    }

    // Ngăn gọi API 2 lần trong React Strict Mode (mỗi code chỉ được xử lý một lần)
    if (processedCodes.has(code)) return;
    processedCodes.add(code);

    // Gửi code + state lên backend để đổi lấy access_token + refresh_token
    handleGoogleCallback(code, state)
      .then(() => {
        toast.success("Đăng nhập Google thành công!");
        void navigate({ to: "/" });
      })
      .catch(() => {
        // Thường gặp khi: state JWT hết hạn (> 10 phút), hoặc code đã được dùng rồi
        toast.error("Không thể xác thực với Google. Vui lòng thử lại.");
        void navigate({ to: "/login" });
      });
  }, [code, state, error, handleGoogleCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm">Đang xác thực với Google...</p>
      </div>
    </div>
  );
}
