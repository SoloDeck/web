import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { submitIntake, type IntakePayload } from "@/services/intakeService";

/**
 * Public lead-capture form. Rendered by the unauthenticated `/intake/$token`
 * route; the owner is resolved server-side from `shareToken`.
 */
export function IntakeForm({ shareToken }: { shareToken: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = name.trim().length > 0 && inquiry.trim().length > 0 && !submitting;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload: IntakePayload = { name: name.trim(), inquiry_text: inquiry.trim() };
    if (email.trim()) payload.email = email.trim();
    if (phone.trim()) payload.phone = phone.trim();
    if (budget.trim()) payload.estimated_budget = budget.trim();
    if (timeline.trim()) payload.desired_timeline = timeline.trim();

    setSubmitting(true);
    try {
      await submitIntake(shareToken, payload);
      setDone(true);
    } catch {
      toast.error("Không thể gửi yêu cầu. Vui lòng kiểm tra lại và thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <h1 className="text-xl font-bold">Đã nhận yêu cầu của bạn</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight">SoloDesk</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-xl font-bold tracking-tight">Gửi yêu cầu tư vấn</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Điền thông tin bên dưới, chúng tôi sẽ liên hệ lại với bạn.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <Field label="Họ và tên" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className={inputCls}
                aria-label="Họ và tên"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@vidu.com"
                  className={inputCls}
                  aria-label="Email"
                />
              </Field>
              <Field label="Số điện thoại">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                  className={inputCls}
                  aria-label="Số điện thoại"
                />
              </Field>
            </div>

            <Field label="Nội dung yêu cầu" required>
              <textarea
                value={inquiry}
                onChange={(e) => setInquiry(e.target.value)}
                placeholder="Mô tả ngắn gọn dự án hoặc nhu cầu của bạn..."
                rows={4}
                className={`${inputCls} resize-y`}
                aria-label="Nội dung yêu cầu"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Ngân sách dự kiến">
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="VD: 20.000.000đ"
                  className={inputCls}
                  aria-label="Ngân sách dự kiến"
                />
              </Field>
              <Field label="Thời gian mong muốn">
                <input
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="VD: 1 tháng"
                  className={inputCls}
                  aria-label="Thời gian mong muốn"
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}
