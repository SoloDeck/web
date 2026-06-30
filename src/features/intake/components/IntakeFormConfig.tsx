import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Info,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { cn } from "@/lib/utils";
import {
  getIntakeFormConfig,
  updateIntakeFormConfig,
  type IntakeFormConfigResponse,
  type IntakeFormFieldPayload,
  type IntakeFormFieldResponse,
} from "@/services/intakeService";

type FieldType = "text" | "email" | "tel" | "textarea" | "select";

type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  visible: boolean;
  placeholder: string;
  options?: string[];
};

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "text", label: "Câu trả lời ngắn" },
  { value: "textarea", label: "Đoạn văn" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Số điện thoại" },
  { value: "select", label: "Danh sách lựa chọn" },
];

const DEFAULT_FIELDS: FieldConfig[] = [
  {
    key: "name",
    label: "Họ tên khách hàng",
    type: "text",
    required: true,
    visible: true,
    placeholder: "Nguyễn Văn A",
  },
  {
    key: "phone",
    label: "Số điện thoại",
    type: "tel",
    required: true,
    visible: true,
    placeholder: "09xx xxx xxx",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
    required: false,
    visible: true,
    placeholder: "email@vidu.vn",
  },
  {
    key: "project_name",
    label: "Tên dự án",
    type: "text",
    required: true,
    visible: true,
    placeholder: "Ví dụ: Thiết kế trang bán hàng",
  },
  {
    key: "inquiry_text",
    label: "Mô tả nhu cầu",
    type: "textarea",
    required: true,
    visible: true,
    placeholder: "Mô tả mục tiêu và yêu cầu chính của dự án...",
  },
  {
    key: "estimated_budget",
    label: "Ngân sách dự kiến",
    type: "text",
    required: false,
    visible: true,
    placeholder: "Ví dụ: 5.000.000 - 10.000.000 VNĐ",
  },
  {
    key: "desired_timeline",
    label: "Thời gian mong muốn",
    type: "text",
    required: false,
    visible: true,
    placeholder: "Ví dụ: Trong 2 tuần",
  },
];

const INTAKE_FORM_QUERY_KEY = ["intake-form-config"] as const;

function apiFieldTypeToUi(type: string): FieldType {
  if (type === "phone") return "tel";
  if (["text", "email", "tel", "textarea", "select"].includes(type)) return type as FieldType;
  return "text";
}

function uiFieldTypeToApi(type: FieldType): string {
  // Backend đang dùng field_type = "phone", còn UI dùng "tel" để rõ kiểu input.
  return type === "tel" ? "phone" : type;
}

function fieldFromApi(field: IntakeFormFieldResponse): FieldConfig {
  const type = apiFieldTypeToUi(field.field_type);

  return {
    key: field.field_key,
    label: field.label,
    type,
    required: field.is_required,
    visible: field.is_visible,
    placeholder: field.placeholder ?? defaultPlaceholder(type),
  };
}

function fieldsFromConfig(config: IntakeFormConfigResponse | undefined): FieldConfig[] {
  if (!config?.fields?.length) return DEFAULT_FIELDS;

  return [...config.fields]
    .sort((current, next) => current.sort_order - next.sort_order)
    .map(fieldFromApi);
}

function fieldToPayload(field: FieldConfig, index: number): IntakeFormFieldPayload {
  return {
    field_key: field.key.slice(0, 100),
    label: field.label.trim(),
    placeholder: field.placeholder.trim() || null,
    field_type: uiFieldTypeToApi(field.type),
    is_required: field.required,
    is_visible: field.visible,
    sort_order: index + 1,
  };
}

type IntakeFormSnapshot = {
  title: string;
  description: string;
  isActive: boolean;
  fields: IntakeFormFieldPayload[];
};

function createConfigSnapshot(
  title: string,
  description: string,
  isActive: boolean,
  fields: FieldConfig[],
): IntakeFormSnapshot {
  return {
    title: title.trim(),
    description: description.trim(),
    isActive,
    fields: fields.map(fieldToPayload),
  };
}

function snapshotFromConfig(config: IntakeFormConfigResponse | undefined): IntakeFormSnapshot | null {
  if (!config) return null;
  return createConfigSnapshot(
    config.title,
    config.description ?? "",
    config.is_active,
    fieldsFromConfig(config),
  );
}

export function IntakeFormConfig() {
  const accountName = useAuthStore((state) => state.user?.fullName);
  const queryClient = useQueryClient();
  const intakeFormQuery = useQuery({
    queryKey: INTAKE_FORM_QUERY_KEY,
    queryFn: getIntakeFormConfig,
  });
  const [formTitle, setFormTitle] = useState("Gửi yêu cầu dự án");
  const [formDescription, setFormDescription] = useState(
    "Hãy chia sẻ một vài thông tin để tôi hiểu rõ nhu cầu và chuẩn bị tư vấn phù hợp cho bạn.",
  );
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FieldConfig[]>(DEFAULT_FIELDS);
  const [showAddField, setShowAddField] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<FieldConfig | null>(null);
  const savedSnapshot = useMemo(
    () => snapshotFromConfig(intakeFormQuery.data),
    [intakeFormQuery.data],
  );
  const currentSnapshot = useMemo(
    () => createConfigSnapshot(formTitle, formDescription, isActive, fields),
    [fields, formDescription, formTitle, isActive],
  );
  // Dirty checking: so sánh bản đang chỉnh với bản đã lưu; nếu user đổi lại như cũ thì nút lưu tự tắt.
  const hasConfigChanges = Boolean(
    savedSnapshot && JSON.stringify(currentSnapshot) !== JSON.stringify(savedSnapshot),
  );

  useEffect(() => {
    if (!intakeFormQuery.data) return;

    setFormTitle(intakeFormQuery.data.title);
    setFormDescription(intakeFormQuery.data.description ?? "");
    setIsActive(intakeFormQuery.data.is_active);
    setFields(fieldsFromConfig(intakeFormQuery.data));
  }, [intakeFormQuery.data]);

  const saveConfigMutation = useMutation({
    mutationFn: updateIntakeFormConfig,
    onSuccess: (savedConfig) => {
      queryClient.setQueryData(INTAKE_FORM_QUERY_KEY, savedConfig);
      toast.success("Đã lưu cấu hình biểu mẫu tiếp nhận.");
    },
    onError: () => {
      toast.error("Không thể lưu cấu hình biểu mẫu. Vui lòng thử lại.");
    },
  });

  const updateField = (key: string, changes: Partial<FieldConfig>) => {
    setFields((current) =>
      current.map((field) => (field.key === key ? { ...field, ...changes } : field)),
    );
  };

  const visibleFields = fields.filter((field) => field.visible);

  const saveFormConfig = () => {
    if (!formTitle.trim()) {
      toast.error("Tiêu đề biểu mẫu không được để trống.");
      return;
    }

    if (fields.length === 0) {
      toast.error("Biểu mẫu cần ít nhất một trường thông tin.");
      return;
    }

    saveConfigMutation.mutate({
      title: currentSnapshot.title,
      description: currentSnapshot.description || null,
      is_active: isActive,
      fields: currentSnapshot.fields,
    });
  };

  const addField = (field: Omit<FieldConfig, "key">) => {
    setFields((current) => [
      ...current,
      { ...field, key: `custom-${Date.now()}-${current.length}` },
    ]);
    setShowAddField(false);
    toast.success(`Đã thêm trường “${field.label}”.`);
  };

  const deleteField = () => {
    if (!fieldToDelete) return;
    setFields((current) => current.filter((field) => field.key !== fieldToDelete.key));
    toast.success(`Đã xóa trường “${fieldToDelete.label}”.`);
    setFieldToDelete(null);
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-muted/20 xl:overflow-hidden">
      <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8 xl:h-full">
        <div className="grid grid-cols-1 items-start gap-6 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
          <div className="space-y-5 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:space-y-0 xl:gap-5">
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs xl:shrink-0">
              <SectionHeader
                icon={FileText}
                title="Thông tin biểu mẫu"
                description="Nội dung giới thiệu khách hàng sẽ nhìn thấy đầu tiên."
                step="01"
                action={
                  <Button
                    type="button"
                    size="sm"
                    variant={hasConfigChanges ? "default" : "secondary"}
                    onClick={saveFormConfig}
                    disabled={!hasConfigChanges || intakeFormQuery.isLoading || saveConfigMutation.isPending}
                    title={hasConfigChanges ? "Lưu thay đổi biểu mẫu" : "Chưa có thay đổi để lưu"}
                  >
                    {saveConfigMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    {saveConfigMutation.isPending ? "Đang lưu" : "Lưu cấu hình"}
                  </Button>
                }
              />
              <div className="grid gap-4 p-4 sm:p-5">
                {intakeFormQuery.isError && (
                  <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs leading-5 text-destructive">
                    Chưa tải được cấu hình từ backend. Bạn vẫn có thể chỉnh trước trên UI,
                    rồi bấm tải lại khi API sẵn sàng.
                  </div>
                )}

                <FormField label="Tiêu đề biểu mẫu" htmlFor="form-title">
                  <Input
                    id="form-title"
                    value={formTitle}
                    onChange={(event) => setFormTitle(event.target.value)}
                    placeholder="Nhập tiêu đề biểu mẫu"
                  />
                </FormField>

                <FormField label="Mô tả biểu mẫu" htmlFor="form-description">
                  <Textarea
                    id="form-description"
                    value={formDescription}
                    onChange={(event) => setFormDescription(event.target.value)}
                    rows={3}
                    className="resize-none"
                    placeholder="Giới thiệu ngắn về mục đích của biểu mẫu"
                  />
                </FormField>

                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <ControlSwitch
                    label="Biểu mẫu đang hoạt động"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    Khi tắt, khách hàng không nên gửi yêu cầu mới qua đường dẫn chia sẻ.
                  </p>
                </div>

              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
              <SectionHeader
                icon={ClipboardCheck}
                title="Cấu hình trường thông tin"
                description="Chọn nội dung cần hỏi và điều chỉnh nhãn cho phù hợp."
                step="02"
                action={
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {visibleFields.length}/{fields.length} đang hiển thị
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={showAddField ? "secondary" : "outline"}
                      onClick={() => setShowAddField((current) => !current)}
                    >
                      {showAddField ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                      {showAddField ? "Đóng" : "Thêm trường"}
                    </Button>
                  </div>
                }
              />

              <div className="space-y-2.5 p-3 sm:p-5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
                {showAddField && (
                  <AddFieldPanel
                    onAdd={addField}
                    onCancel={() => setShowAddField(false)}
                  />
                )}

                {fields.length === 0 && !showAddField && (
                  <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
                    <div>
                      <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                        <Plus className="size-4" />
                      </div>
                      <p className="text-sm font-semibold">Biểu mẫu chưa có trường thông tin</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Thêm câu hỏi đầu tiên để bắt đầu xây dựng biểu mẫu.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-4"
                        onClick={() => setShowAddField(true)}
                      >
                        <Plus className="size-3.5" />
                        Thêm trường đầu tiên
                      </Button>
                    </div>
                  </div>
                )}

                {fields.map((field, index) => (
                  <FieldRow
                    key={field.key}
                    field={field}
                    index={index}
                    onChange={(changes) => updateField(field.key, changes)}
                    onDelete={() => setFieldToDelete(field)}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:space-y-0 xl:gap-5">
            <ShareLinkCard
              shareUrl={intakeFormQuery.data?.share_url ?? null}
              loading={intakeFormQuery.isLoading}
            />

            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Xem trước biểu mẫu</h3>
                </div>
                <span className="rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground">
                  Góc nhìn khách hàng
                </span>
              </div>
              <div className="bg-gradient-to-b from-primary/5 to-transparent p-3 sm:p-4 xl:min-h-0 xl:flex-1">
                <FormPreview
                  title={formTitle}
                  description={formDescription}
                  displayName={accountName ?? ""}
                  fields={visibleFields}
                />
              </div>
            </section>

          </aside>
        </div>
      </div>

      <AlertDialog
        open={fieldToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFieldToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa trường thông tin?</AlertDialogTitle>
            <AlertDialogDescription>
              Trường “{fieldToDelete?.label}” sẽ bị xóa khỏi cấu hình và bản xem trước. Thao tác này chưa thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lại</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteField}>
              <Trash2 className="size-4" />
              Xóa trường
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type SectionHeaderProps = {
  icon: typeof FileText;
  title: string;
  description: string;
  step: string;
  action?: React.ReactNode;
};

function SectionHeader({ icon: Icon, title, description, step, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground/60">
              {step}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      {action && <div className="sm:shrink-0">{action}</div>}
    </div>
  );
}

type FormFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
};

function FormField({ label, htmlFor, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

type AddFieldPanelProps = {
  onAdd: (field: Omit<FieldConfig, "key">) => void;
  onCancel: () => void;
};

function AddFieldPanel({ onAdd, onCancel }: AddFieldPanelProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [placeholder, setPlaceholder] = useState("");
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState("");

  const options = optionsText
    .split("\n")
    .map((option) => option.trim())
    .filter(Boolean);
  const canAdd = label.trim().length > 0 && (type !== "select" || options.length >= 2);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAdd) return;

    onAdd({
      label: label.trim(),
      type,
      required,
      visible: true,
      placeholder: placeholder.trim() || defaultPlaceholder(type),
      ...(type === "select" ? { options } : {}),
    });
  };

  return (
    <form
      onSubmit={submit}
      className="mb-4 space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4 shadow-sm animate-in fade-in-0 slide-in-from-top-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Thêm trường tùy chỉnh</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tạo câu hỏi mới và xem ngay trong bản xem trước.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng phần thêm trường"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nhãn trường" htmlFor="new-field-label">
          <Input
            id="new-field-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ví dụ: Bạn biết đến tôi từ đâu?"
            autoFocus
          />
        </FormField>

        <FormField label="Loại câu trả lời" htmlFor="new-field-type">
          <NativeSelect
            id="new-field-type"
            value={type}
            onChange={(event) => setType(event.target.value as FieldType)}
            className="w-full"
          >
            {FIELD_TYPE_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
      </div>

      {type === "select" ? (
        <FormField
          label="Các lựa chọn"
          htmlFor="new-field-options"
          hint="Nhập ít nhất 2 lựa chọn, mỗi dòng một nội dung."
        >
          <Textarea
            id="new-field-options"
            value={optionsText}
            onChange={(event) => setOptionsText(event.target.value)}
            rows={4}
            className="resize-none bg-background"
            placeholder={"Lựa chọn 1\nLựa chọn 2\nLựa chọn 3"}
          />
        </FormField>
      ) : (
        <FormField
          label="Nội dung gợi ý"
          htmlFor="new-field-placeholder"
          hint="Có thể để trống."
        >
          <Input
            id="new-field-placeholder"
            value={placeholder}
            onChange={(event) => setPlaceholder(event.target.value)}
            placeholder={defaultPlaceholder(type)}
            className="bg-background"
          />
        </FormField>
      )}

      <div className="flex flex-col gap-3 border-t border-primary/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <ControlSwitch
          label="Bắt buộc trả lời"
          checked={required}
          onCheckedChange={setRequired}
        />
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit" size="sm" disabled={!canAdd}>
            <Plus className="size-3.5" />
            Thêm vào biểu mẫu
          </Button>
        </div>
      </div>

      {type === "select" && options.length < 2 && optionsText.length > 0 && (
        <p className="text-xs text-destructive">Cần ít nhất 2 lựa chọn để thêm trường này.</p>
      )}
    </form>
  );
}

function defaultPlaceholder(type: FieldType): string {
  const placeholders: Record<FieldType, string> = {
    text: "Nhập câu trả lời ngắn",
    textarea: "Nhập câu trả lời chi tiết...",
    email: "email@vidu.vn",
    tel: "Nhập số điện thoại",
    select: "Chọn một lựa chọn",
  };
  return placeholders[type];
}

type FieldRowProps = {
  field: FieldConfig;
  index: number;
  onChange: (changes: Partial<FieldConfig>) => void;
  onDelete: () => void;
};

function FieldRow({ field, index, onChange, onDelete }: FieldRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(field.label);

  const saveLabel = () => {
    const nextLabel = draftLabel.trim();
    if (nextLabel) {
      onChange({ label: nextLabel });
    } else {
      setDraftLabel(field.label);
    }
    setEditing(false);
  };

  return (
    <div
      data-testid={`field-row-${field.key}`}
      className={cn(
        "group rounded-xl border p-3 transition-all duration-200 sm:p-3.5",
        field.visible
          ? "border-border bg-background hover:border-primary/30 hover:shadow-sm"
          : "border-dashed border-border/80 bg-muted/30",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold",
              field.visible ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>

          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                autoFocus
                value={draftLabel}
                aria-label="Chỉnh sửa nhãn trường"
                onChange={(event) => setDraftLabel(event.target.value)}
                onBlur={saveLabel}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveLabel();
                  if (event.key === "Escape") {
                    setDraftLabel(field.label);
                    setEditing(false);
                  }
                }}
                className="h-8"
              />
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "truncate text-sm font-semibold",
                    !field.visible && "text-muted-foreground",
                  )}
                >
                  {field.label}
                </span>
                {field.required && field.visible && (
                  <span className="text-xs font-bold text-destructive" aria-label="Bắt buộc">
                    *
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Chỉnh sửa nhãn ${field.label}`}
                  onClick={() => {
                    setDraftLabel(field.label);
                    setEditing(true);
                  }}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Xóa trường ${field.label}`}
                  onClick={onDelete}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {field.visible ? "Đang xuất hiện trong bản xem trước" : "Trường này đang được ẩn"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-3 sm:justify-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <ControlSwitch
            label="Bắt buộc"
            checked={field.required}
            disabled={!field.visible}
            onCheckedChange={(checked) => onChange({ required: checked })}
          />
          <ControlSwitch
            label="Hiển thị"
            checked={field.visible}
            onCheckedChange={(checked) => onChange({ visible: checked })}
          />
        </div>
      </div>
    </div>
  );
}

type ControlSwitchProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function ControlSwitch({ label, checked, disabled, onCheckedChange }: ControlSwitchProps) {
  return (
    <div className={cn("flex items-center gap-2 text-xs font-medium", disabled && "text-muted-foreground")}>
      <Switch
        size="sm"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={`${label}: ${checked ? "Bật" : "Tắt"}`}
      />
      <span>{label}</span>
    </div>
  );
}

type FormPreviewProps = {
  title: string;
  description: string;
  displayName: string;
  fields: FieldConfig[];
};

function FormPreview({ title, description, displayName, fields }: FormPreviewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs xl:h-full">
      <div className="h-1.5 bg-gradient-to-r from-primary to-primary-glow" />
      <div className="max-h-[640px] overflow-y-auto p-4 sm:p-5 xl:h-[calc(100%-0.375rem)] xl:max-h-none">
        <div className="mb-5 space-y-2 border-b border-border pb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            {displayName.trim() ? `Biểu mẫu của ${displayName}` : "Biểu mẫu của Freelancer"}
          </p>
          <h4 className="text-lg font-bold leading-snug">{title.trim() || "Biểu mẫu chưa có tiêu đề"}</h4>
          <p className="text-xs leading-5 text-muted-foreground">
            {description.trim() || "Thêm mô tả để khách hàng hiểu rõ mục đích của biểu mẫu."}
          </p>
          <p className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
            <Info className="size-3" />
            Dấu * là câu hỏi bắt buộc
          </p>
        </div>

        {fields.length === 0 ? (
          <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
            <div>
              <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <EyeOff className="size-4" />
              </div>
              <p className="text-sm font-semibold">Chưa có trường nào hiển thị</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Bật “Hiển thị” cho ít nhất một trường để xem trước.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {fields.map((field) => (
              <PreviewField key={field.key} field={field} />
            ))}
            <Button type="button" disabled className="mt-1 w-full">
              Gửi yêu cầu
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">
              Nút gửi đang tắt trong chế độ xem trước
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewField({ field }: { field: FieldConfig }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 text-xs font-medium">
        <span>{field.label}</span>
        {field.required && <span className="font-bold text-destructive">*</span>}
      </div>
      {field.type === "textarea" ? (
        <div className="min-h-16 rounded-lg border border-input bg-muted/20 px-3 py-2 text-xs text-muted-foreground/70">
          {field.placeholder}
        </div>
      ) : field.type === "select" ? (
        <div className="flex h-9 items-center justify-between rounded-lg border border-input bg-muted/20 px-3 text-xs text-muted-foreground/70">
          <span>{field.placeholder}</span>
          <ChevronDown className="size-3.5" />
        </div>
      ) : (
        <div className="flex h-9 items-center rounded-lg border border-input bg-muted/20 px-3 text-xs text-muted-foreground/70">
          {field.placeholder}
        </div>
      )}
    </div>
  );
}

type ShareLinkCardProps = {
  shareUrl: string | null;
  loading: boolean;
};

function normalizeShareUrlForCurrentSite(shareUrl: string | null): string | null {
  if (!shareUrl) return null;

  try {
    const parsedUrl = new URL(shareUrl, window.location.origin);
    const isPublicIntakePath =
      parsedUrl.pathname.startsWith("/bieu-mau/") ||
      parsedUrl.pathname.startsWith("/intake/");

    // Backend có thể trả domain production; khi test local, dùng origin hiện tại để mở đúng FE đang chạy.
    if (isPublicIntakePath) {
      return `${window.location.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }
  } catch {
    return shareUrl;
  }

  return shareUrl;
}

function ShareLinkCard({ shareUrl, loading }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const publicShareUrl = normalizeShareUrlForCurrentSite(shareUrl);
  const displayUrl = loading
    ? "Đang lấy đường dẫn từ backend..."
    : publicShareUrl ?? "Chưa có đường dẫn chia sẻ";

  const copyLink = async () => {
    if (!publicShareUrl) {
      toast.error("Backend chưa trả đường dẫn chia sẻ cho biểu mẫu này.");
      return;
    }

    try {
      await navigator.clipboard.writeText(publicShareUrl);
      setCopied(true);
      toast.success("Đã sao chép đường dẫn biểu mẫu.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép đường dẫn. Vui lòng thử lại.");
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Link2 className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Chia sẻ biểu mẫu</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Gửi đường dẫn công khai cho khách hàng.</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
          <Input
            readOnly
            value={displayUrl}
            aria-label="Đường dẫn chia sẻ biểu mẫu"
            className="min-w-0 flex-1 bg-muted/30 text-xs"
          />
          <Button
            type="button"
            onClick={copyLink}
            className="shrink-0"
            disabled={!publicShareUrl || loading}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Đã sao chép" : "Sao chép link"}
          </Button>
        </div>
        <p className="flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" />
          {publicShareUrl
            ? "Đường dẫn này dùng domain hiện tại để mở đúng biểu mẫu public."
            : "Backend chưa cấp share_url. Hãy tải lại hoặc lưu cấu hình để backend tạo đường dẫn."}
        </p>
      </div>
    </section>
  );
}
