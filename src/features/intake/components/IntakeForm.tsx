import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  LockKeyhole,
  Paperclip,
  Send,
  Trash2,
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
  uploadIntakeAttachment,
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming).filter(
      (f) => !attachments.some((a) => a.name === f.name && a.size === f.size),
    );
    setAttachments((prev) => [...prev, ...next]);
  };

  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

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

  /** "Đang gửi tệp 2/3…" — tệp lớn thì bước này lâu, im lặng là người ta bấm gửi lại. */
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const submitMutation = useMutation({
    mutationFn: async (payload: IntakePayload) => {
      const response = await submitIntake(shareToken, payload);

      // TỆP ĐI SAU PHIẾU: phải có id phiếu mới gắn được, nên đây là các lệnh gọi riêng.
      //
      // Tệp lỗi KHÔNG được làm hỏng việc đã gửi form — deal đã tạo bên kia rồi, báo "gửi
      // thất bại" là nói dối và khách sẽ gửi lại lần nữa, đẻ ra deal trùng.  #Huynh
      if (attachments.length > 0) {
        const failed: string[] = [];
        for (const [index, file] of attachments.entries()) {
          setUploadProgress({ done: index, total: attachments.length });
          try {
            await uploadIntakeAttachment(shareToken, response.id, file);
          } catch {
            failed.push(file.name);
          }
        }
        setUploadProgress(null);
        if (failed.length > 0) {
          toast.error(
            `Đã gửi yêu cầu, nhưng không tải lên được ${failed.length} tệp: ${failed.join(", ")}. ` +
              "Bạn có thể gửi lại các tệp này qua email cho freelancer.",
          );
        }
      }
      return response;
    },
    onSuccess: (response) => {
      setResult(response);
    },
    onError: () => {
      setUploadProgress(null);
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
    submitMutation.mutate({
      ...buildPayload(fields, values),
      attachment_count: attachments.length,
    });
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
    // KHÔNG có vỏ trang ở đây (không min-h-screen, không header, không footer): component
    // này giờ là một khối nằm bên dưới hồ sơ trong `PublicSharePage`, không còn là cả trang.
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-primary/5">
      <div className="h-1.5 bg-gradient-to-r from-primary to-primary-glow" />
      <div className="border-b border-border px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <BriefcaseBusiness className="size-5" />
          </div>
          <div>
            {/* Tên freelancer xuất hiện ĐÚNG MỘT LẦN trong khối này — hồ sơ phía trên đã in
                tên ở thẻ h1 rồi, lặp lại nữa là thừa và làm hỏng phép đếm trong test. */}
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Gửi tới <span className="text-foreground">{freelancerName}</span>
            </div>
            <h2 className="mt-0.5 text-xl font-bold tracking-tight">{title}</h2>
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

              <FormSection
                step="03"
                title="Tài liệu đính kèm"
                description="Brief, mockup, hoặc tài liệu tham khảo sẽ giúp Freelancer hiểu nhanh hơn."
                bordered
              >
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-5 py-7 text-center transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <div className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                    <Paperclip className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Kéo thả file vào đây</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      hoặc <span className="font-medium text-primary underline underline-offset-2">bấm để chọn file</span>
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">PDF, Word, Excel, hình ảnh · Tối đa 10MB/file</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                />
                {attachments.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {attachments.map((file, index) => (
                      <li
                        key={`${file.name}-${file.size}`}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                      >
                        <FileText className="size-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{file.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {file.size < 1024 * 1024
                              ? `${(file.size / 1024).toFixed(1)} KB`
                              : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </FormSection>

              <div className="border-t border-border bg-muted/20 px-5 py-5 sm:px-7">
                <Button type="submit" size="lg" disabled={!canSubmit} className="w-full sm:w-auto sm:min-w-52">
                  {submitMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {/* Tệp lớn thì bước tải lên lâu — im lặng là khách tưởng treo rồi bấm
                      gửi lại, đẻ ra deal trùng. */}
                  {submitMutation.isPending
                    ? uploadProgress
                      ? `Đang gửi tệp ${uploadProgress.done + 1}/${uploadProgress.total}...`
                      : "Đang gửi yêu cầu..."
                    : "Gửi yêu cầu"}
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
        <div className="text-[10px] text-muted-foreground">Quản lý khách hàng cho freelancer</div>
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
    // Không chiếm cả màn hình nữa: hồ sơ freelancer vẫn nằm phía trên, nên lời cảm ơn hiện
    // ngay tại chỗ biểu mẫu vừa biến mất — khách vẫn thấy mình đang ở trang của ai.
    <div className="mx-auto w-full max-w-lg">
      <div className="overflow-hidden rounded-2xl border border-border bg-card text-center shadow-xl">
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
