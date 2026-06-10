import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: ForgotPasswordPage,
});

// eslint-disable-next-line react-refresh/only-export-components
function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Quên mật khẩu"
      subtitle="Nhập email của bạn, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
      footer={
        <>
          Nhớ ra mật khẩu rồi?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
