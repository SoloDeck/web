import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { DEMO_CREDENTIALS } from "@/services/authService";
import { GoogleButton } from "./GoogleButton";

export function LoginForm() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const error = useAuthStore((s) => s.error);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      toast.success("Đăng nhập thành công!", {
        description: "Đang chuyển hướng vào SoloDesk...",
        duration: 2000,
      });
      setTimeout(() => navigate({ to: "/" }), 2000);
    } catch {
      /* error surfaced via store */
    }
  };

  const fillDemo = (cred: (typeof DEMO_CREDENTIALS)[number]) => {
    setEmail(cred.email);
    setPassword(cred.password);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive">
          <span className="mt-px select-none">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@email.com"
            className="pl-9"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Mật khẩu</Label>
          <Link
            to="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="pl-9 pr-10"
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Remember me */}
      <div className="flex items-center gap-2.5">
        <Checkbox
          id="remember-me"
          checked={rememberMe}
          onCheckedChange={(v) => setRememberMe(Boolean(v))}
        />
        <Label
          htmlFor="remember-me"
          className="cursor-pointer select-none text-sm font-normal"
        >
          Ghi nhớ đăng nhập
        </Label>
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        Đăng nhập
      </Button>

      {/* Divider */}
      <div className="relative py-1">
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <span className="relative flex justify-center">
          <span className="bg-card px-2 text-xs text-muted-foreground">
            hoặc
          </span>
        </span>
      </div>

      {/* Google */}
      <GoogleButton onDone={() => navigate({ to: "/" })} />

      {/* Demo accounts */}
      <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tài khoản demo — bấm để điền
        </p>
        <div className="space-y-1.5">
          {DEMO_CREDENTIALS.map((cred) => (
            <button
              key={cred.email}
              type="button"
              onClick={() => fillDemo(cred)}
              className="flex w-full items-center justify-between rounded-lg border border-border/40 bg-background/80 px-3 py-2 text-xs transition-colors hover:border-primary/30 hover:bg-secondary text-left"
            >
              <span className="font-semibold text-foreground">{cred.label}</span>
              <span className="font-mono text-muted-foreground">{cred.email}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Mật khẩu:{" "}
          <span className="font-mono font-medium text-foreground">123456</span>
        </p>
      </div>
    </form>
  );
}
