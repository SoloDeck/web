import { useMemo, useState } from "react";
import {
  ClipboardCheck,
  Eye,
  FileText,
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
import { cn } from "@/lib/utils";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api-error";
import { validateSlug } from "@/features/profile/slugRules";
import {
  AppearanceSettings,
  type AppearanceDraft,
} from "@/features/intake/components/AppearanceSettings";
import { IntakeLinkCard } from "@/features/intake/components/IntakeLinkCard";
import { PreviewFrame } from "@/features/intake/components/PreviewFrame";
import { PublicSharePageView } from "@/features/intake/components/PublicSharePageView";
import {
  getMe,
  updateFreelancerProfile,
  usersKeys,
  type UserResponse,
} from "@/services/usersService";
import {
  getIntakeFormConfig,
  updateIntakeFormConfig,
  type IntakeFormConfigResponse,
  type IntakeFormFieldPayload,
  type IntakeFormFieldResponse,
  type PublicIntakeFormConfigResponse,
  type PublicProfileResponse,
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

/**
 * Họ tên KHÔNG ẩn được: `PublicIntakeRequest.name` là bắt buộc ở schema backend ("needed to
 * create a client record"), và `IntakeForm` tự chèn lại trường này nếu cấu hình thiếu. Bày
 * ra một công tắc rồi vẫn hiện là giao diện nói dối — bỏ hẳn công tắc và nói rõ vì sao.
 */
const ALWAYS_VISIBLE_KEYS = new Set(["name"]);

/** Phải còn ít nhất MỘT trong hai: ẩn cả hai thì lead về mà không có đường liên hệ lại. */
const CONTACT_KEYS = ["email", "phone"] as const;

type PageKey = "appearance" | "form";

/** Hai trang của cột chỉnh sửa. Mục "Cấu hình trường thông tin" đi cùng trang biểu mẫu. */
const PAGES: { key: PageKey; label: string }[] = [
  { key: "appearance", label: "Diện mạo trang" },
  { key: "form", label: "Biểu mẫu tiếp nhận" },
];

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
    .map(fieldFromApi)
    // Ép các trường luôn-hỏi về trạng thái hiện. Dữ liệu cũ có thể đã lưu họ tên ở trạng
    // thái ẩn — mà trang thật vẫn hỏi nó, nên để nguyên là bảng cấu hình nói một đằng còn
    // khách thấy một nẻo. Lưu lần tới là dữ liệu tự khớp lại.
    .map((f) => (ALWAYS_VISIBLE_KEYS.has(f.key) ? { ...f, visible: true } : f));
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

/** Diện mạo lấy từ `GET /users/me`; chưa tải xong thì để trống, đừng đoán. */
function appearanceFromMe(me: UserResponse | undefined): AppearanceDraft {
  return {
    coverUrl: me?.cover_url ?? "",
    brandColor: me?.brand_color ?? "",
    profileSlug: me?.profile_slug ?? "",
  };
}

export function IntakeFormConfig() {
  const queryClient = useQueryClient();
  const intakeFormQuery = useQuery({
    queryKey: INTAKE_FORM_QUERY_KEY,
    queryFn: getIntakeFormConfig,
  });
  // Diện mạo trang công khai nay chỉnh NGAY TẠI ĐÂY. Đọc thẳng từ react-query chứ không
  // nhận qua props: `useProfile` của màn Cài đặt là một nguồn khác (useState + localStorage),
  // luồn nó xuống đây là có hai bản sao cùng một dữ liệu trên hai màn hình.  #Huynh
  const meQuery = useQuery({ queryKey: usersKeys.me, queryFn: getMe });
  const [formTitle, setFormTitle] = useState("Gửi yêu cầu dự án");
  const [formDescription, setFormDescription] = useState(
    "Hãy chia sẻ một vài thông tin để tôi hiểu rõ nhu cầu và chuẩn bị tư vấn phù hợp cho bạn.",
  );
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FieldConfig[]>(DEFAULT_FIELDS);
  const [page, setPage] = useState<PageKey>("appearance");
  const [showAddField, setShowAddField] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<FieldConfig | null>(null);
  const [appearance, setAppearance] = useState<AppearanceDraft>(() => appearanceFromMe(undefined));
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
  const savedAppearance = useMemo(() => appearanceFromMe(meQuery.data), [meQuery.data]);
  const hasAppearanceChanges =
    Boolean(meQuery.data) && JSON.stringify(appearance) !== JSON.stringify(savedAppearance);

  // MỘT trạng thái "chưa lưu" cho cả trang. Trước đây diện mạo và nội dung biểu mẫu nằm ở hai
  // màn khác nhau, mỗi màn một nút Lưu và một kiểu đo "đã đổi gì chưa".
  const slugError = validateSlug(appearance.profileSlug);
  const hasChanges = hasConfigChanges || hasAppearanceChanges;
  const canSave = hasChanges && !slugError;

  // Nạp bản đã lưu vào các ô nhập NGAY TRONG LÚC RENDER, không qua `useEffect`.
  //
  // Đây là "đồng bộ state theo dữ liệu bên ngoài" — React khuyến nghị làm thẳng trong thân
  // render rồi nó tự dựng lại ngay, không commit bản trung gian. Làm qua effect thì mỗi lần
  // dữ liệu về là người dùng thấy một nhịp giá trị mặc định nhấp nháy trước khi bản thật đè
  // lên, và eslint chặn đúng vì lý do đó.
  //
  // So sánh bằng THAM CHIẾU là đủ và đúng: react-query chỉ đổi object khi có dữ liệu mới,
  // còn sau khi lưu thì `setQueryData` cũng trả về object mới nên ô nhập nạp lại bản vừa ghi.
  const [seededConfig, setSeededConfig] = useState<IntakeFormConfigResponse | undefined>();
  if (intakeFormQuery.data && intakeFormQuery.data !== seededConfig) {
    setSeededConfig(intakeFormQuery.data);
    setFormTitle(intakeFormQuery.data.title);
    setFormDescription(intakeFormQuery.data.description ?? "");
    setIsActive(intakeFormQuery.data.is_active);
    setFields(fieldsFromConfig(intakeFormQuery.data));
  }

  const [seededMe, setSeededMe] = useState<UserResponse | undefined>();
  if (meQuery.data && meQuery.data !== seededMe) {
    setSeededMe(meQuery.data);
    setAppearance(appearanceFromMe(meQuery.data));
  }

  /**
   * Một nút Lưu, hai đích: nội dung biểu mẫu đi `PUT /intake-form`, còn diện mạo đi
   * `PATCH /users/me/freelancer-profile` với ĐÚNG ba trường.
   *
   * Không mượn `useSaveProfile` của màn Cài đặt: hook đó đẩy cả gói ngân hàng/MoMo/nhắc nhở
   * và có bước ghi số điện thoại có thể 409 — đổi một màu nền mà kéo theo chừng ấy rủi ro
   * thì không đáng.
   *
   * Chỉ gửi phần nào thật sự đổi, và nếu một nửa hỏng thì NÓI RA nửa nào đã lưu. Báo "Đã lưu"
   * khi mới lưu được một nửa là thứ khiến người dùng đóng tab rồi mất việc.  #Huynh
   */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const failed: string[] = [];
      let savedConfig: Awaited<ReturnType<typeof updateIntakeFormConfig>> | null = null;

      if (hasConfigChanges) {
        try {
          savedConfig = await updateIntakeFormConfig({
            title: currentSnapshot.title,
            description: currentSnapshot.description || null,
            is_active: isActive,
            fields: currentSnapshot.fields,
          });
        } catch {
          failed.push("nội dung biểu mẫu");
        }
      }

      let appearanceError: unknown = null;
      if (hasAppearanceChanges) {
        try {
          await updateFreelancerProfile({
            cover_url: appearance.coverUrl,
            brand_color: appearance.brandColor,
            profile_slug: appearance.profileSlug,
          });
        } catch (err) {
          appearanceError = err;
          failed.push("diện mạo trang");
        }
      }

      return { savedConfig, failed, appearanceError };
    },
    onSuccess: ({ savedConfig, failed, appearanceError }) => {
      if (savedConfig) queryClient.setQueryData(INTAKE_FORM_QUERY_KEY, savedConfig);
      queryClient.invalidateQueries({ queryKey: usersKeys.me });

      if (failed.length === 0) {
        toast.success("Đã lưu trang công khai.");
        return;
      }
      // Tên đường dẫn trùng là 409 — thông điệp của backend đã viết cho người dùng đọc.
      if (appearanceError && getApiErrorStatus(appearanceError) === 409) {
        toast.error(
          getApiErrorMessage(
            appearanceError,
            "Tên đường dẫn này đã có người dùng, bạn chọn tên khác nhé.",
          ),
        );
        return;
      }
      const saved = failed.length === 2 ? "" : " Phần còn lại đã lưu.";
      toast.error(`Chưa lưu được ${failed.join(" và ")}.${saved} Bạn thử lại nhé.`);
    },
    onError: () => {
      toast.error("Không thể lưu. Vui lòng thử lại.");
    },
  });

  /**
   * Vì sao trường này không ẩn được. `null` = ẩn thoải mái.
   *
   * Hai luật, hai lý do khác nhau: họ tên là ràng buộc KỸ THUẬT (backend bắt buộc mới tạo
   * được hồ sơ khách), còn email/SĐT là ràng buộc NGHIỆP VỤ (ẩn nốt cái cuối thì lead về mà
   * không có đường liên hệ lại — đúng thứ CRM sinh ra để tránh).  #Huynh
   */
  const lockFor = (field: FieldConfig): { locked: boolean; lockedReason?: string } => {
    // Họ tên: nhãn "Luôn hiển thị" đã nói đủ, không cần thêm câu giải thích.
    if (ALWAYS_VISIBLE_KEYS.has(field.key)) return { locked: true };

    const isLastContact =
      (CONTACT_KEYS as readonly string[]).includes(field.key) &&
      field.visible &&
      fields.filter((f) => (CONTACT_KEYS as readonly string[]).includes(f.key) && f.visible)
        .length === 1;
    return isLastContact
      ? {
          locked: true,
          lockedReason:
            "Giữ lại ít nhất một cách liên hệ, không thì khách gửi xong bạn không hồi âm được.",
        }
      : { locked: false };
  };

  const updateField = (key: string, changes: Partial<FieldConfig>) => {
    setFields((current) =>
      current.map((field) => (field.key === key ? { ...field, ...changes } : field)),
    );
  };

  const visibleFields = fields.filter((field) => field.visible);

  // Dựng đúng hai kiểu dữ liệu mà trang thật nhận, từ bản ĐANG GÕ. Ép qua đúng hình dạng của
  // API là cách rẻ nhất để khung xem trước không thể nhận một thứ trang thật không có.
  const previewProfile: PublicProfileResponse = {
    full_name: meQuery.data?.full_name || "Tên của bạn",
    professional_title: meQuery.data?.professional_title ?? null,
    bio: meQuery.data?.bio ?? null,
    avatar_url: meQuery.data?.avatar_url ?? null,
    cover_url: appearance.coverUrl || null,
    brand_color: appearance.brandColor || null,
    skills: meQuery.data?.professional_profile?.skills ?? [],
    portfolio_url: meQuery.data?.professional_profile?.portfolio_url ?? null,
  };

  const previewConfig: PublicIntakeFormConfigResponse = {
    title: formTitle,
    description: formDescription || null,
    freelancer_name: meQuery.data?.full_name || "Freelancer",
    is_active: isActive,
    fields: visibleFields.map((field) => ({
      field_key: field.key,
      label: field.label,
      placeholder: field.placeholder ?? "",
      field_type: field.type,
      is_required: field.required,
    })),
  };

  const savePage = () => {
    if (!formTitle.trim()) {
      toast.error("Tiêu đề biểu mẫu không được để trống.");
      return;
    }

    if (fields.length === 0) {
      toast.error("Biểu mẫu cần ít nhất một trường thông tin.");
      return;
    }

    if (slugError) {
      toast.error(slugError);
      return;
    }

    saveMutation.mutate();
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
    <div className="h-full min-h-0 overflow-y-auto bg-muted/20">
      <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
          <div className="space-y-5">
            {/* Chia hai trang thay vì xếp dọc: cả ba mục cộng lại dài hơn màn hình, mà thứ
                đáng nhìn nhất — khung xem trước — thì nằm bên phải. Bắt người dùng cuộn là
                bắt họ rời mắt khỏi nó. Diện mạo đứng trước, đúng thứ tự khách thấy trên
                trang: ảnh bìa và hồ sơ ở trên, biểu mẫu ở dưới.  #Huynh */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-2 shadow-xs">
              <div className="flex gap-1">
                {PAGES.map((p, index) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPage(p.key)}
                    aria-current={page === p.key ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                      page === p.key
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-full text-[11px] font-bold",
                        page === p.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {/* Lỗi tên đường dẫn nằm ở trang 1; đứng ở trang 2 mà chỉ thấy nút Lưu mờ đi
                    thì không đoán được phải sửa gì, ở đâu. */}
                {slugError && page !== "appearance" && (
                  <button
                    type="button"
                    onClick={() => setPage("appearance")}
                    className="text-xs font-medium text-destructive underline-offset-2 hover:underline"
                  >
                    Tên đường dẫn chưa hợp lệ — sửa ở trang 1
                  </button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={canSave ? "default" : "secondary"}
                  onClick={savePage}
                  disabled={!canSave || intakeFormQuery.isLoading || saveMutation.isPending}
                  title={
                    slugError
                      ? slugError
                      : hasChanges
                        ? "Lưu thay đổi trang công khai"
                        : "Chưa có thay đổi để lưu"
                  }
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {saveMutation.isPending ? "Đang lưu" : "Lưu thay đổi"}
                </Button>
              </div>
            </div>

            {/* Thẻ link đứng NGOÀI phân trang, ngay dưới nút Lưu: ô sửa tên đường dẫn nằm
                trong nó, mà thứ lưu nó lại là nút bên này — tách hai phía là bắt người dùng
                sửa một bên rồi đi tìm nút bấm ở bên kia.  #Huynh */}
            <IntakeLinkCard
              slug={appearance.profileSlug}
              onSlugChange={(profileSlug) => setAppearance({ ...appearance, profileSlug })}
              slugError={slugError}
              isActive={isActive}
              onIsActiveChange={setIsActive}
            />

            {page === "appearance" && (
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="p-4 sm:p-5">
                <AppearanceSettings value={appearance} onChange={setAppearance} />
              </div>
            </section>
            )}

            {page === "form" && (
            <>
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
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


              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <SectionHeader
                icon={ClipboardCheck}
                title="Cấu hình trường thông tin"
                description="Chọn nội dung cần hỏi và điều chỉnh nhãn cho phù hợp."
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

              <div className="space-y-2.5 p-3 sm:p-5">
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
                    {...lockFor(field)}
                  />
                ))}
              </div>
            </section>
            </>
            )}
          </div>

          <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Xem trước trang công khai</h3>
                </div>
              </div>
              {/* Khung này render CHÍNH `PublicSharePageView` của trang thật, không phải bản
                  vẽ lại — nên không có chuyện xem trước một đằng khách thấy một nẻo. Dữ liệu
                  lấy từ bản đang gõ, nên đổi theo từng phím chứ không đợi bấm Lưu. */}
              <div className="bg-gradient-to-b from-primary/5 to-transparent p-3 sm:p-4">
                <PreviewFrame brandColor={previewProfile.brand_color ?? ""} maxHeight={860}>
                  <PublicSharePageView
                    variant="preview"
                    profile={previewProfile}
                    shareToken={meQuery.data?.intake_share_token ?? ""}
                    previewConfig={previewConfig}
                  />
                </PreviewFrame>
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
  /** Số thứ tự mục. Bỏ trống khi thanh phân trang đã đánh số — đừng đánh số hai lần. */
  step?: string;
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
            {step && (
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground/60">
                {step}
              </span>
            )}
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
      // Không hỏi câu gợi ý nữa — mỗi loại câu trả lời đã có sẵn một câu mặc định, bắt
      // người dùng nghĩ thêm một câu chỉ để ô nhập bớt trống là việc không đáng.
      placeholder: defaultPlaceholder(type),
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

      {type === "select" && (
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
  /** Không cho ẩn: bỏ công tắc Hiển thị, thay bằng nhãn "Luôn hiển thị". */
  locked?: boolean;
  /** Câu giải thích kèm theo, chỉ khi lý do không tự hiển nhiên. */
  lockedReason?: string;
};

function FieldRow({ field, index, onChange, onDelete, locked, lockedReason }: FieldRowProps) {
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
            {lockedReason && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{lockedReason}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-3 sm:justify-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <ControlSwitch
            label="Bắt buộc"
            checked={field.required}
            disabled={!field.visible}
            onCheckedChange={(checked) => onChange({ required: checked })}
          />
          {locked ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Luôn hiển thị
            </span>
          ) : (
            <ControlSwitch
              label="Hiển thị"
              checked={field.visible}
              onCheckedChange={(checked) => onChange({ visible: checked })}
            />
          )}
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


