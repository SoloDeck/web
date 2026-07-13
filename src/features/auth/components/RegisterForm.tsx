import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { GoogleButton } from "./GoogleButton";

const MIN_PASSWORD = 8;
const EMAIL_EXISTS_MSG = "Email này đã được đăng ký.";

type FieldErrors = {
  email?: string;
  password?: string;
  confirm?: string;
};

export function RegisterForm() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const error = useAuthStore((s) => s.error);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Button stays busy from submit through the post-success redirect delay.
  const isBusy = isSubmitting || isRedirecting;

  // 409 → show inline under email; everything else → global banner
  const emailFieldError = fieldErrors.email ?? (error === EMAIL_EXISTS_MSG ? error : undefined);
  const globalError = error && error !== EMAIL_EXISTS_MSG ? error : null;

  const clearField = (field: keyof FieldErrors) =>
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const errors: FieldErrors = {};
    if (password.length < MIN_PASSWORD) {
      errors.password = `Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự.`;
    }
    if (password !== confirm) {
      errors.confirm = "Mật khẩu xác nhận không khớp.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    try {
      await register({ fullName, email, password });
      setIsRedirecting(true);
      toast.success("Tạo tài khoản thành công!", {
        description: "Chào mừng bạn đến với SoloDesk!",
        duration: 2000,
      });
      // Đưa thẳng vào onboarding để hồ sơ chuyên môn có dữ liệu ngay từ đầu —
      // AI chấm điểm lead và gợi giá đều đọc từ đó.
      setTimeout(() => navigate({ to: "/onboarding" }), 2000);
    } catch {
      /* error surfaced via store */
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* API error banner (non-email errors) */}
      {globalError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive">
          <span className="mt-px select-none">⚠</span>
          <span>{globalError}</span>
        </div>
      )}

      {/* Họ và tên */}
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Họ và tên</Label>
        <Input
          id="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nguyễn Văn A"
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearField("email"); }}
          placeholder="ban@email.com"
          aria-invalid={!!emailFieldError}
        />
        {emailFieldError && (
          <p className="text-xs text-destructive">{emailFieldError}</p>
        )}
      </div>

      {/* Mật khẩu */}
      <div className="space-y-1.5">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearField("password"); }}
          placeholder={`Tối thiểu ${MIN_PASSWORD} ký tự`}
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        )}
      </div>

      {/* Xác nhận mật khẩu */}
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); clearField("confirm"); }}
          placeholder="••••••••"
          aria-invalid={!!fieldErrors.confirm}
        />
        {fieldErrors.confirm && (
          <p className="text-xs text-destructive">{fieldErrors.confirm}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isBusy}>
        {isBusy ? <Loader2 className="animate-spin" /> : <UserPlus />}
        Tạo tài khoản
      </Button>

      <div className="relative py-1 text-center">
        <span className="relative z-10 bg-card px-2 text-xs text-muted-foreground">hoặc</span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
      </div>

      <GoogleButton onDone={() => navigate({ to: "/onboarding" })} />
    </form>
  );
}
