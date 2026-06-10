import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: RegisterPage,
});

// eslint-disable-next-line react-refresh/only-export-components
function RegisterPage() {
  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Bắt đầu quản lý khách hàng và hợp đồng cùng SoloDesk."
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
