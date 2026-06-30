import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getPublicIntakeFormConfig,
  submitIntake,
  type IntakePayload,
  type IntakeResult,
  type PublicIntakeFormFieldResponse,
} from "@/services/intakeService";

type FieldValues = Record<string, string>;

const NAME_FIELD: PublicIntakeFormFieldResponse = {
  field_key: "name",
  label: "Họ tên khách hàng",
  placeholder: "Nguyễn Văn A",
  field_type: "text",
  is_required: true,
};

const CONTACT_FIELD_KEYS = new Set(["name", "phone", "email"]);
const STANDARD_PAYLOAD_KEYS = new Set([
  "name",
  "phone",
  "email",
  "project_name",
  "inquiry_text",
  "estimated_budget",
  "desired_timeline",
]);

export function IntakeForm({ shareToken }: { shareToken: string }) {
  const [values, setValues] = useState<FieldValues>({});
  const [result, setResult] = useState<IntakeResult | null>(null);

  const configQuery = useQuery({
    queryKey: ["public-intake-form-config", shareToken],
    queryFn: () => getPublicIntakeFormConfig(shareToken),
    retry: false,
  });

  const fields = useMemo(
    () => normalizePublicFields(configQuery.data?.fields ?? []),
    [configQuery.data?.fields],
  );

  useEffect(() => {
    setValues((current) => {
      const next = createEmptyValues(fields);
      for (const field of fields) {
        next[field.field_key] = current[field.field_key] ?? "";
      }
      return next;
    });
  }, [fields]);

  const submitMutation = useMutation({
    mutationFn: (payload: IntakePayload) => submitIntake(shareToken, payload),
    onSuccess: (response) => {
      setResult(response);
    },
    onError: () => {
      toast.error("Không thể gửi yêu cầu. Vui lòng kiểm tra lại và thử lại sau.");
    },
  });

  const requiredFields = fields.filter((field) => field.is_required);
  const canSubmit =
    configQuery.isSuccess &&
    requiredFields.every((field) => values[field.field_key]?.trim()) &&
    !submitMutation.isPending;

  const contactFields = fields.filter((field) => CONTACT_FIELD_KEYS.has(field.field_key));
  const projectFields = fields.filter((field) => !CONTACT_FIELD_KEYS.has(field.field_key));
  const title = configQuery.data?.title ?? "Biểu mẫu tiếp nhận yêu cầu";
  const configuredDescription = configQuery.data?.description?.trim();
  const description =
    configuredDescription ||
    "Điền một vài thông tin để Freelancer hiểu rõ nhu cầu và chuẩn bị phương án tư vấn phù hợp.";
  const freelancerName = configQuery.data?.freelancer_name ?? "Freelancer";

  const updateValue = (fieldKey: string, value: string) => {
    setValues((current) => ({ ...current, [fieldKey]: value }));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    submitMutation.mutate(buildPayload(fields, values));
  };

  if (result) {
    return (
      <SuccessState
        freelancerName={freelancerName}
        onSendAnother={() => {
          setResult(null);
          setValues(createEmptyValues(fields));
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 hero-dot-grid opacity-60" />

      <header className="relative z-10 border-b border-border/70 bg-background/90 backdrop-blur-xl">
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
            Biểu mẫu của {freelancerName}
          </div>
          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Chia sẻ dự án của bạn,
            <span className="block text-primary">bắt đầu thật dễ dàng.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            {description}
          </p>

          <div className="mt-8 space-y-4">
            <Benefit
              icon={FileCheck2}
              title="Thông tin rõ ràng"
              description="Giúp hai bên tiết kiệm thời gian trao đổi ban đầu."
            />
            <Benefit
              icon={Clock3}
              title="Chỉ mất vài phút"
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
                <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Các trường có dấu <span className="font-semibold text-destructive">*</span> là thông tin bắt buộc.
                </p>
              </div>
            </div>
          </div>

          {configQuery.isLoading ? (
            <LoadingState />
          ) : configQuery.isError ? (
            <ErrorState onRetry={() => configQuery.refetch()} />
          ) : (
            <form onSubmit={onSubmit}>
              <FormSection
                step="01"
                title="Thông tin liên hệ"
                description="Freelancer sẽ dùng thông tin này để phản hồi bạn."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {contactFields.map((field) => (
                    <DynamicField
                      key={field.field_key}
                      field={field}
                      value={values[field.field_key] ?? ""}
                      onChange={(value) => updateValue(field.field_key, value)}
                      className={field.field_key === "name" ? "sm:col-span-2" : undefined}
                    />
                  ))}
                </div>
              </FormSection>

              {projectFields.length > 0 && (
                <FormSection
                  step="02"
                  title="Thông tin dự án"
                  description="Càng cụ thể, buổi tư vấn đầu tiên càng hiệu quả."
                  bordered
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    {projectFields.map((field) => (
                      <DynamicField
                        key={field.field_key}
                        field={field}
                        value={values[field.field_key] ?? ""}
                        onChange={(value) => updateValue(field.field_key, value)}
                        className={isLongField(field) ? "sm:col-span-2" : undefined}
                      />
                    ))}
                  </div>
                </FormSection>
              )}

              <div className="border-t border-border bg-muted/20 px-5 py-5 sm:px-7">
                <Button type="submit" size="lg" disabled={!canSubmit} className="w-full sm:w-auto sm:min-w-52">
                  {submitMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {submitMutation.isPending ? "Đang gửi yêu cầu..." : "Gửi yêu cầu"}
                  {!submitMutation.isPending && <ArrowRight className="size-4" />}
                </Button>
                <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
                  <LockKeyhole className="mt-0.5 size-3 shrink-0" />
                  Khi gửi biểu mẫu, bạn đồng ý để Freelancer liên hệ lại về yêu cầu này.
                </p>
              </div>
            </form>
          )}
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        Biểu mẫu được tạo và bảo mật bởi <span className="font-semibold text-foreground">SoloDesk</span>
      </footer>
    </div>
  );
}

function normalizePublicFields(fields: PublicIntakeFormFieldResponse[]): PublicIntakeFormFieldResponse[] {
  const normalized = fields.map((field) =>
    field.field_key === "name" ? { ...field, is_required: true } : field,
  );

  // Backend vẫn cần `name` để tạo client, nên FE luôn đảm bảo có trường này.
  if (!normalized.some((field) => field.field_key === "name")) {
    return [NAME_FIELD, ...normalized];
  }

  return normalized;
}

function createEmptyValues(fields: PublicIntakeFormFieldResponse[]): FieldValues {
  return Object.fromEntries(fields.map((field) => [field.field_key, ""]));
}

function buildPayload(fields: PublicIntakeFormFieldResponse[], values: FieldValues): IntakePayload {
  const payload: IntakePayload = {
    name: (values.name ?? "").trim(),
  };
  const customLines: string[] = [];
  const inquiry = values.inquiry_text?.trim();

  for (const field of fields) {
    const value = values[field.field_key]?.trim();
    if (!value) continue;

    if (field.field_key === "phone") payload.phone = value;
    else if (field.field_key === "email") payload.email = value;
    else if (field.field_key === "project_name") payload.project_name = value;
    else if (field.field_key === "estimated_budget") payload.estimated_budget = value;
    else if (field.field_key === "desired_timeline") payload.desired_timeline = value;
    else if (!STANDARD_PAYLOAD_KEYS.has(field.field_key)) customLines.push(`${field.label}: ${value}`);
  }

  const inquiryLines = [inquiry, ...customLines].filter(Boolean);
  if (inquiryLines.length > 0) payload.inquiry_text = inquiryLines.join("\n");

  return payload;
}

function isLongField(field: PublicIntakeFormFieldResponse): boolean {
  return field.field_type === "textarea" || field.field_key === "inquiry_text";
}

function fieldInputType(fieldType: string): "text" | "email" | "tel" {
  if (fieldType === "email") return "email";
  if (fieldType === "phone" || fieldType === "tel") return "tel";
  return "text";
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
  children: ReactNode;
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

type DynamicFieldProps = {
  field: PublicIntakeFormFieldResponse;
  value: string;
  className?: string;
  onChange: (value: string) => void;
};

function DynamicField({ field, value, className, onChange }: DynamicFieldProps) {
  const fieldId = `intake-${field.field_key}`;

  return (
    <label className={cn("block", className)} htmlFor={fieldId}>
      <span className="mb-1.5 block text-xs font-semibold">
        {field.label}
        {field.is_required && <span className="text-destructive"> *</span>}
      </span>
      {field.field_type === "textarea" ? (
        <Textarea
          id={fieldId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder ?? "Nhập nội dung"}
          rows={field.field_key === "inquiry_text" ? 5 : 3}
          className="resize-y"
          aria-label={field.label}
          required={field.is_required}
        />
      ) : (
        <Input
          id={fieldId}
          type={fieldInputType(field.field_type)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder ?? "Nhập thông tin"}
          aria-label={field.label}
          autoComplete={field.field_key === "name" ? "name" : field.field_key}
          inputMode={field.field_type === "phone" ? "tel" : undefined}
          required={field.is_required}
        />
      )}
    </label>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-80 place-items-center px-5 py-12 text-center sm:px-7">
      <div>
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm font-semibold">Đang tải biểu mẫu</p>
        <p className="mt-1 text-xs text-muted-foreground">SoloDesk đang lấy cấu hình mới nhất từ Freelancer.</p>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-80 place-items-center px-5 py-12 text-center sm:px-7">
      <div className="max-w-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <LockKeyhole className="size-5" />
        </div>
        <h2 className="mt-4 text-lg font-bold">Không mở được biểu mẫu</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Đường dẫn có thể đã sai hoặc biểu mẫu không còn khả dụng. Bạn có thể thử tải lại trang.
        </p>
        <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
          Tải lại biểu mẫu
        </Button>
      </div>
    </div>
  );
}

function SuccessState({
  freelancerName,
  onSendAnother,
}: {
  freelancerName: string;
  onSendAnother: () => void;
}) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 hero-dot-grid opacity-60" />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card text-center shadow-xl">
        <div className="h-1.5 bg-gradient-to-r from-success to-primary" />
        <div className="p-7 sm:p-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-success ring-8 ring-success/5">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Đã nhận yêu cầu của bạn</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Cảm ơn bạn đã chia sẻ thông tin. {freelancerName} sẽ xem yêu cầu và liên hệ lại trong thời gian sớm nhất.
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
