import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmPasswordReset, requestPasswordReset } from "@/services/authService";
import { getApiErrorCode, getApiErrorMessage, getApiErrorStatus } from "@/lib/api-error";

const MIN_PASSWORD = 8;
const OTP_LENGTH = 6;

/**
 * Vì sao KHÔNG gửi được mã OTP — nói đúng việc người đọc nên làm tiếp.
 *
 * Bản trước ở đây là một `catch {}` TRẦN, mọi thứ hỏng đều ra đúng một câu "Hệ thống chưa
 * gửi được email lúc này. Vui lòng thử lại sau ít phút." Câu đó che mất ba chuyện khác hẳn
 * nhau — mất mạng, hộp thư sai cấu hình, chạm giới hạn gửi — và với hai cái đầu thì lời
 * khuyên "thử lại sau ít phút" là SAI: thử lại bao nhiêu lần cũng vậy.
 *
 * Ngày 04/08 chính chỗ này làm cả buổi truy lỗi trở thành đoán mò: màn hình báo hỏng mà
 * không ai biết hỏng ở đâu, phải đi gọi API thật để đo mới ra.
 *
 * Phân nhánh theo `status` + `code`, KHÔNG so khớp câu chữ.  #Huynh
 */
function otpSendErrorMessage(err: unknown): string {
  const status = getApiErrorStatus(err);

  // Không có status = request chưa từng nhận được câu trả lời: mất mạng, DNS hỏng, hoặc
  // backend im lặng quá 15 giây (`configs/axios.ts`) rồi axios bỏ cuộc. Khác hẳn với
  // "máy chủ đã trả lời rằng nó hỏng", nên phải là một câu khác.
  if (status === undefined) {
    return "Không kết nối được máy chủ. Kiểm tra đường mạng rồi thử lại.";
  }

  // Backend đã phân loại sẵn (sai cấu hình hộp thư / chạm giới hạn gửi / không nối được
  // máy chủ thư) và soạn câu an toàn cho từng nhóm. Hiện NGUYÊN câu đó — tự vẽ lại ở đây
  // là dựng nguồn sự thật thứ hai, kiểu gì cũng có ngày lệch.
  if (getApiErrorCode(err) === "EMAIL_DELIVERY_FAILED") {
    return getApiErrorMessage(err, "Hệ thống thư đang gặp sự cố. Vui lòng thử lại sau.");
  }

  if (status === 429) {
    return getApiErrorMessage(
      err,
      "Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi vài phút rồi thử lại."
    );
  }
  if (status === 422) {
    return getApiErrorMessage(err, "Email không hợp lệ. Kiểm tra lại địa chỉ email.");
  }
  return getApiErrorMessage(err, "Chưa gửi được mã OTP. Vui lòng thử lại sau ít phút.");
}

export function ForgotPasswordForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp" | "done">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setStep("otp");
    } catch (err) {
      // BE luôn trả 200 kể cả khi email không tồn tại (cố tình, để không lộ email
      // nào đã đăng ký). Nên lỗi ở đây KHÔNG BAO GIỜ là "email sai" — nó là hệ
      // thống hỏng. Đừng bảo người dùng đi kiểm tra lại địa chỉ email.
      //
      // Luôn log lỗi thô: màn hình cố tình nói ngắn gọn, nhưng devtools thì phải thấy
      // được nguyên nhân thật. Nuốt trọn lỗi là tự bịt mắt mình cho lần sửa sau.
      console.error("[password-reset] gửi OTP thất bại", err);
      setError(otpSendErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD) {
      setError(`Mật khẩu cần tối thiểu ${MIN_PASSWORD} ký tự.`);
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(otp.trim(), password);
      setStep("done");
      toast.success("Đã đổi mật khẩu thành công!");
    } catch (err) {
      // BE ném AuthenticationError (401) cho cả mã sai lẫn mã hết hạn — không phân
      // biệt được, nên thông điệp phải bao cả hai khả năng.
      if (getApiErrorStatus(err) === 401) {
        setError("Mã OTP không đúng hoặc đã hết hạn. Mã chỉ có hiệu lực trong 15 phút.");
      } else {
        setError("Không đổi được mật khẩu. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      toast.success("Đã gửi lại mã OTP.");
    } catch (err) {
      // Cùng một endpoint thì cùng một cách giải thích lỗi — hai nơi tự nghĩ ra hai câu
      // là kiểu gì cũng có ngày một nơi được cập nhật còn nơi kia thì không.
      console.error("[password-reset] gửi lại OTP thất bại", err);
      setError(otpSendErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Xong ────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success/10 px-3 py-3 text-sm text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-medium">Đã đổi mật khẩu thành công</div>
            <p className="mt-0.5 text-success/80">
              Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
            </p>
          </div>
        </div>
        <Button type="button" className="w-full" onClick={() => navigate({ to: "/login" })}>
          Đăng nhập
        </Button>
      </div>
    );
  }

  // ── Bước 2: nhập OTP + mật khẩu mới ────────────────────────────────────
  if (step === "otp") {
    return (
      <form onSubmit={handleConfirm} className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-border bg-secondary/50 px-3 py-3 text-sm">
          <Send className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nếu <b className="text-foreground">{email}</b> đã đăng ký, mã OTP {OTP_LENGTH} số đã
            được gửi tới đó. Mã có hiệu lực <b className="text-foreground">15 phút</b>. Nhớ kiểm tra
            cả hộp thư rác.
          </p>
        </div>

        {error && (
          // role="alert" — không có nó thì trình đọc màn hình KHÔNG đọc câu lỗi này ra:
          // người dùng khiếm thị bấm "Gửi mã OTP" rồi ngồi đợi một thứ không bao giờ tới,
          // mà chẳng được báo gì cả. Cùng họ với chuyện `catch {}` nuốt lý do.  #Huynh
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="otp">Mã OTP</Label>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={OTP_LENGTH}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="text-center text-lg tracking-[0.4em]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-password">Mật khẩu mới</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Tối thiểu ${MIN_PASSWORD} ký tự`}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Nhập lại mật khẩu mới</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting || otp.length < OTP_LENGTH}>
          {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
          Đổi mật khẩu
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Đổi email
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={submitting}
            className="font-medium text-primary hover:underline disabled:opacity-50"
          >
            Gửi lại mã
          </button>
        </div>
      </form>
    );
  }

  // ── Bước 1: nhập email ──────────────────────────────────────────────────
  return (
    <form onSubmit={handleSendOtp} className="space-y-4">
      {error && (
        // role="alert" — xem chú thích ở hộp lỗi bước nhập OTP. Đây là hộp NGƯỜI DÙNG GẶP
        // ĐẦU TIÊN khi hệ thống thư hỏng, thiếu nó là hỏng im lặng với trình đọc màn hình.
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
        Gửi mã OTP
      </Button>
    </form>
  );
}
