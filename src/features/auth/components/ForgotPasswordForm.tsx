import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/services/authService";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success/10 px-3 py-3 text-sm text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-medium">Đã gửi hướng dẫn đặt lại mật khẩu</div>
            <p className="mt-0.5 text-success/80">
              Nếu <b>{email}</b> đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài
              phút. Vui lòng kiểm tra cả hộp thư rác.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
        >
          Gửi lại
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" /> : <Send />}
        Gửi liên kết đặt lại
      </Button>
    </form>
  );
}
