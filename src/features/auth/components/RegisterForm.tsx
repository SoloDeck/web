import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { GoogleButton } from "./GoogleButton";

const MIN_PASSWORD = 6;

export function RegisterForm() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const error = useAuthStore((s) => s.error);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Button stays busy from submit through the post-success redirect delay.
  const isBusy = isSubmitting || isRedirecting;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password.length < MIN_PASSWORD) {
      setLocalError(`Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự.`);
      return;
    }
    if (password !== confirm) {
      setLocalError("Mật khẩu xác nhận không khớp.");
      return;
    }
    try {
      await register({ fullName, email, password });
      setIsRedirecting(true);
      toast.success("Tạo tài khoản thành công!", {
        description: "Chào mừng bạn đến với SoloDesk!",
        duration: 2000,
      });
      setTimeout(() => navigate({ to: "/" }), 2000);
    } catch {
      /* error surfaced via store */
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {(localError || error) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {localError ?? error}
        </div>
      )}

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

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@email.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Tối thiểu 6 ký tự"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isBusy}>
        {isBusy ? <Loader2 className="animate-spin" /> : <UserPlus />}
        Tạo tài khoản
      </Button>

      <div className="relative py-1 text-center">
        <span className="relative z-10 bg-card px-2 text-xs text-muted-foreground">hoặc</span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
      </div>

      <GoogleButton onDone={() => navigate({ to: "/" })} />
    </form>
  );
}
