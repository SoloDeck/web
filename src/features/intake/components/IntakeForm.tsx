import { useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { submitIntake, type IntakePayload, type IntakeResult } from "@/services/intakeService";

const SERVICE_OPTIONS = [
  "Thiết kế website",
  "Phát triển ứng dụng",
  "Thiết kế thương hiệu",
  "Tiếp thị số",
  "Tư vấn",
  "Dịch vụ khác",
];

export function IntakeForm({ shareToken }: { shareToken: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [projectName, setProjectName] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);

  const canSubmit =
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    projectName.trim().length > 0 &&
    inquiry.trim().length > 0 &&
    !submitting;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const inquiryLines = [
      `Tên dự án: ${projectName.trim()}`,
      serviceType ? `Loại dịch vụ: ${serviceType}` : "",
      `Mô tả nhu cầu: ${inquiry.trim()}`,
      notes.trim() ? `Ghi chú thêm: ${notes.trim()}` : "",
    ].filter(Boolean);

    const payload: IntakePayload = {
      name: name.trim(),
      phone: phone.trim(),
      inquiry_text: inquiryLines.join("\n"),
    };
    if (email.trim()) payload.email = email.trim();
    if (budget.trim()) payload.estimated_budget = budget.trim();
    if (timeline.trim()) payload.desired_timeline = timeline.trim();

    setSubmitting(true);
    try {
      const response = await submitIntake(shareToken, payload);
      setResult(response);
    } catch {
      toast.error("Không thể gửi yêu cầu. Vui lòng kiểm tra lại và thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return <SuccessState onSendAnother={() => setResult(null)} />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 hero-dot-grid opacity-70" />
      <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-primary-glow/10 blur-3xl" />

      <header className="relative z-10 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <LockKeyhole className="size-3.5 text-success" />
            <span className="hidden sm:inline">Kết nối được bảo mật</span>
            <span className="sm:hidden">Bảo mật</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12 lg:py-16">
        <aside className="self-start lg:sticky lg:top-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Biểu mẫu tiếp nhận yêu cầu
          </div>
          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Chia sẻ dự án của bạn,
            <span className="block text-primary">bắt đầu thật dễ dàng.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Điền một vài thông tin để Freelancer hiểu rõ nhu cầu và chuẩn bị phương án tư vấn phù hợp nhất.
          </p>

          <div className="mt-8 space-y-4">
            <Benefit
              icon={FileCheck2}
              title="Thông tin rõ ràng"
              description="Giúp hai bên tiết kiệm thời gian trao đổi ban đầu."
            />
            <Benefit
              icon={Clock3}
              title="Chỉ mất khoảng 3 phút"
              description="Bạn có thể bổ sung chi tiết sau khi Freelancer liên hệ."
            />
            <Benefit
              icon={ShieldCheck}
              title="Riêng tư và bảo mật"
              description="Thông tin chỉ được sử dụng để tư vấn cho yêu cầu này."
            />
          </div>

          <div className="mt-8 hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <Check className="size-3.5 text-success" />
            Không cần đăng nhập hoặc tạo tài khoản
          </div>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-primary/5">
          <div className="h-1.5 bg-gradient-to-r from-primary to-primary-glow" />
          <div className="border-b border-border px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <BriefcaseBusiness className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Gửi yêu cầu dự án</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Các trường có dấu <span className="font-semibold text-destructive">*</span> là thông tin bắt buộc.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit}>
            <FormSection
              step="01"
              title="Thông tin liên hệ"
              description="Freelancer sẽ dùng thông tin này để phản hồi bạn."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Họ tên khách hàng" required className="sm:col-span-2">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nguyễn Văn A"
                    aria-label="Họ tên khách hàng"
                    autoComplete="name"
                  />
                </Field>
                <Field label="Số điện thoại" required>
                  <Input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="09xx xxx xxx"
                    aria-label="Số điện thoại"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="email@vidu.vn"
                    aria-label="Email"
                    autoComplete="email"
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection
              step="02"
              title="Thông tin dự án"
              description="Càng cụ thể, buổi tư vấn đầu tiên càng hiệu quả."
              bordered
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tên dự án" required>
                  <Input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder="Ví dụ: Website bán hàng"
                    aria-label="Tên dự án"
                  />
                </Field>
                <Field label="Loại dịch vụ">
                  <NativeSelect
                    value={serviceType}
                    onChange={(event) => setServiceType(event.target.value)}
                    className="w-full"
                    aria-label="Loại dịch vụ"
                  >
                    <NativeSelectOption value="">Chọn loại dịch vụ</NativeSelectOption>
                    {SERVICE_OPTIONS.map((option) => (
                      <NativeSelectOption key={option} value={option}>
                        {option}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Mô tả nhu cầu" required className="sm:col-span-2">
                  <Textarea
                    value={inquiry}
                    onChange={(event) => setInquiry(event.target.value)}
                    placeholder="Mô tả mục tiêu, phạm vi và kết quả bạn mong muốn..."
                    rows={5}
                    className="resize-y"
                    aria-label="Mô tả nhu cầu"
                  />
                </Field>
                <Field label="Ngân sách dự kiến">
                  <Input
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    placeholder="Ví dụ: 10.000.000 VNĐ"
                    aria-label="Ngân sách dự kiến"
                  />
                </Field>
                <Field label="Thời gian mong muốn">
                  <Input
                    value={timeline}
                    onChange={(event) => setTimeline(event.target.value)}
                    placeholder="Ví dụ: Trong 3 tuần"
                    aria-label="Thời gian mong muốn"
                  />
                </Field>
                <Field label="Ghi chú thêm" className="sm:col-span-2">
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Tài liệu tham khảo hoặc thông tin khác bạn muốn chia sẻ..."
                    rows={3}
                    className="resize-y"
                    aria-label="Ghi chú thêm"
                  />
                </Field>
              </div>
            </FormSection>

            <div className="border-t border-border bg-muted/20 px-5 py-5 sm:px-7">
              <Button type="submit" size="lg" disabled={!canSubmit} className="w-full sm:w-auto sm:min-w-52">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu"}
                {!submitting && <ArrowRight className="size-4" />}
              </Button>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
                <LockKeyhole className="mt-0.5 size-3 shrink-0" />
                Khi gửi biểu mẫu, bạn đồng ý để Freelancer liên hệ lại về yêu cầu này.
              </p>
            </div>
          </form>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        Biểu mẫu được tạo và bảo mật bởi <span className="font-semibold text-foreground">SoloDesk</span>
      </footer>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-lg shadow-primary/20">
        <BriefcaseBusiness className="size-4.5 text-primary-foreground" />
      </div>
      <div>
        <div className="text-sm font-bold tracking-tight">SoloDesk</div>
        <div className="text-[10px] text-muted-foreground">Kết nối Freelancer chuyên nghiệp</div>
      </div>
    </div>
  );
}

type BenefitProps = {
  icon: typeof FileCheck2;
  title: string;
  description: string;
};

function Benefit({ icon: Icon, title, description }: BenefitProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-primary shadow-xs">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

type FormSectionProps = {
  step: string;
  title: string;
  description: string;
  bordered?: boolean;
  children: React.ReactNode;
};

function FormSection({ step, title, description, bordered, children }: FormSectionProps) {
  return (
    <section className={bordered ? "border-t border-border" : undefined}>
      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
            {step}
          </span>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

type FieldProps = {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

function Field({ label, required, className, children }: FieldProps) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

function SuccessState({ onSendAnother }: { onSendAnother: () => void }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 hero-dot-grid opacity-70" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-success/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card text-center shadow-xl">
        <div className="h-1.5 bg-gradient-to-r from-success to-primary" />
        <div className="p-7 sm:p-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-success ring-8 ring-success/5">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Đã nhận yêu cầu của bạn</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Cảm ơn bạn đã chia sẻ thông tin. Freelancer sẽ xem yêu cầu và liên hệ lại trong thời gian sớm nhất.
          </p>
          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Check className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Yêu cầu đã được gửi an toàn</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Bạn có thể đóng trang này hoặc gửi thêm một yêu cầu khác.
                </p>
              </div>
            </div>
          </div>
          <Button type="button" variant="outline" className="mt-6" onClick={onSendAnother}>
            Gửi thêm yêu cầu
          </Button>
        </div>
        <div className="border-t border-border bg-muted/20 px-6 py-4">
          <Brand />
        </div>
      </div>
    </div>
  );
}
