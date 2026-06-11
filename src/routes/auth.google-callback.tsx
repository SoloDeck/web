import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

export const Route = createFileRoute("/auth/google-callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: (search.code as string) || undefined,
    state: (search.state as string) || undefined,
    error: (search.error as string) || undefined,
  }),
  component: GoogleCallbackPage,
});

function GoogleCallbackPage() {
  const { code, state, error } = Route.useSearch();
  const navigate = useNavigate();
  const handleGoogleCallback = useAuthStore((s) => s.handleGoogleCallback);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (error || !code || !state) {
      toast.error("Đăng nhập Google thất bại. Vui lòng thử lại.");
      void navigate({ to: "/login" });
      return;
    }

    handleGoogleCallback(code, state)
      .then(() => {
        toast.success("Đăng nhập Google thành công!");
        void navigate({ to: "/" });
      })
      .catch(() => {
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
