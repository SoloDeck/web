import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  FileText,
  ImagePlus,
  Loader2,
  Minus,
  Save,
  Send,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  formatDateForInput,
  formatRelative,
  formatTimeForInput,
  parseVietnameseDateTime,
} from "@/features/reminders/dateTime";
import { WindowControlButton } from "@/components/solodesk/WindowControlButton";
import { useGenerateFollowUp } from "@/features/ai/hooks/useFollowUp";
import { useZaloStatus } from "@/features/profile/hooks/useZalo";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { isUntouchedTemplate, reminderTemplate } from "@/features/reminders/reminderTemplates";
import {
  useCreateReminder,
  useUpdateReminder,
} from "@/features/reminders/hooks/useReminders";
import { previewReminder, uploadReminderImage } from "@/services/remindersService";
import type {
  ReminderChannel,
  ReminderImage,
  ReminderRecord,
  ReminderType,
} from "@/services/remindersService";
import type { FollowUpTone } from "@/services/followupsService";
import type { Deal } from "@/features/deals/types";
import { cn } from "@/lib/utils";

const REMINDER_TYPES: Array<{ value: ReminderType; label: string }> = [
  { value: "follow_up", label: "Follow-up chung" },
  { value: "proposal_follow_up", label: "Nhắc phản hồi báo giá" },
  { value: "contract_signing_nudge", label: "Nhắc ký hợp đồng" },
  { value: "payment_due", label: "Nhắc thanh toán đến hạn" },
  { value: "payment_overdue", label: "Nhắc thanh toán quá hạn" },
  { value: "re_engagement", label: "Chăm sóc lại khách cũ" },
  { value: "custom", label: "Tùy chỉnh" },
];

const CHANNELS: Array<{ value: ReminderChannel; label: string; hint: string }> = [
  { value: "in_app", label: "Chỉ nhắc tôi", hint: "Không gửi gì cho khách" },
  { value: "email", label: "Gửi email cho khách", hint: "SoloDesk gửi email khi tới giờ" },
  { value: "both", label: "Email + nhắc tôi", hint: "Vừa gửi khách vừa báo cho bạn" },
  { value: "zalo", label: "Gửi Zalo cho khách", hint: "Qua Zalo OA của bạn" },
];

const PAYMENT_TYPES = new Set<ReminderType>(["payment_due", "payment_overdue"]);

/** Khớp `MAX_IMAGES_PER_REMINDER` bên backend — chặn sớm để báo ngay thay vì chờ lỗi 422. */
const MAX_IMAGES = 5;

/**
 * Cửa sổ soạn lời nhắc — HAI CỘT: trái cấu hình, phải xem trước thư THẬT.
 *
 * Vì sao tách hẳn ra cửa sổ riêng thay vì form nhét trong tab như trước: thư nhắc thanh
 * toán nay kèm mã QR và số tài khoản. Gửi mà không nhìn thấy trước thì sai một chữ số là
 * khách chuyển tiền cho người lạ — và không ai phát hiện ra cho tới lúc đi đòi.
 *
 * Bản xem trước do SERVER dựng (`POST /reminders/preview`), đúng bằng bộ dựng thư lúc gửi.
 * Vẽ lại ở frontend thì sớm muộn cũng lệch — bài học từ màn báo giá.  #Huynh
 */
export function ReminderComposerModal({
  deal,
  reminder,
  onClose,
}: {
  deal: Deal;
  /** Có = sửa lời nhắc đã có; không = soạn mới. */
  reminder?: ReminderRecord | null;
  onClose: () => void;
}) {
  const { profile } = useProfile();
  const { data: zaloStatus } = useZaloStatus();
  const zaloConnected = zaloStatus?.connected ?? false;
  const createReminder = useCreateReminder(deal.id);
  const updateReminder = useUpdateReminder(deal.id);
  const generateFollowUp = useGenerateFollowUp();

  const [type, setType] = useState<ReminderType>(
    (reminder?.reminder_type as ReminderType) ?? "follow_up",
  );
  const [channel, setChannel] = useState<ReminderChannel>(
    (reminder?.channel as ReminderChannel) ??
      ((profile.reminderChannel as ReminderChannel) || "email"),
  );
  const initialWhen = useMemo(
    () => defaultWhen(reminder, profile.reminderHour),
    [reminder, profile.reminderHour],
  );
  const [date, setDate] = useState(initialWhen.date);
  const [time, setTime] = useState(initialWhen.time);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tone, setTone] = useState<FollowUpTone>("formal");
  const [message, setMessage] = useState(
    reminder?.message_preview ??
      reminderTemplate("follow_up", { client: deal.client, project: deal.projectType }),
  );

  const [preview, setPreview] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ảnh chèn vào thư: mã QR chuyển khoản chụp sẵn từ app ngân hàng, ảnh sản phẩm, mockup.
  const [images, setImages] = useState<ReminderImage[]>(reminder?.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`Mỗi lời nhắc chỉ đính kèm tối đa ${MAX_IMAGES} ảnh.`);
      return;
    }
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const uploaded = await uploadReminderImage(file);
        setImages((current) => [...current, uploaded]);
      } catch {
        // Báo đúng tệp nào hỏng thay vì một câu chung chung — người dùng còn biết bỏ tệp nào.
        toast.error(`Không tải lên được "${file.name}".`);
      }
    }
    setUploading(false);
  };

  const paymentInfoMissing = !profile.bankCode && !profile.momoPhone;
  const needsPaymentInfo = PAYMENT_TYPES.has(type) && paymentInfoMissing;

  // Xem trước hoãn ~700ms sau mỗi lần gõ — cùng nhịp với thanh giá ở modal báo giá: đủ để
  // thấy ngay, không đủ để bắn một lệnh gọi mỗi ký tự.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPreviewLoading(true);
      previewReminder({
        reminder_type: type,
        target_type: "deal",
        target_id: deal.id,
        message,
        attachments: images,
      })
        .then((result) => setPreview(result.html))
        .catch(() => setPreview(""))
        .finally(() => setPreviewLoading(false));
    }, 700);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [type, message, deal.id, images]);

  const plannedAt = useMemo(() => parseVietnameseDateTime(date, time), [date, time]);
  const saving = createReminder.isPending || updateReminder.isPending;

  const vars = useMemo(
    () => ({ client: deal.client, project: deal.projectType }),
    [deal.client, deal.projectType],
  );

  const handleTemplate = () => setMessage(reminderTemplate(type, vars, tone));

  /**
   * Đổi giọng thì ĐỔI CHỮ LUÔN — nhưng chỉ khi ô nội dung vẫn đang là mẫu chưa ai sửa.
   *
   * Bấm nút mà chữ không nhúc nhích thì người dùng tưởng nút hỏng (đã bị báo đúng lỗi đó).
   * Ngược lại, người đã gõ tay cả đoạn mà bấm nhầm nút giọng rồi mất sạch còn tệ hơn.  #Huynh
   */
  const handleTone = (next: FollowUpTone) => {
    setTone(next);
    if (isUntouchedTemplate(message, vars)) {
      setMessage(reminderTemplate(type, vars, next));
    }
  };

  const handleAi = () => {
    generateFollowUp.mutate(
      { reminder_type: type, target_type: "deal", target_id: deal.id, tone },
      {
        onSuccess: (result) => setMessage(result.message_text),
        onError: () => toast.error("AI chưa soạn được tin. Bạn thử lại sau nhé."),
      },
    );
  };

  const handleSave = () => {
    if (!plannedAt) {
      toast.error("Vui lòng nhập ngày theo định dạng ngày/tháng/năm.");
      return;
    }
    const payload = {
      target_type: "deal" as const,
      target_id: deal.id,
      reminder_type: type,
      channel,
      scheduled_at: plannedAt.toISOString(),
      message_preview: message.trim() || null,
      attachments: images,
    };
    const done = {
      onSuccess: () => {
        toast.success(reminder ? "Đã cập nhật lời nhắc." : "Đã đặt lịch nhắc.");
        onClose();
      },
      onError: () => toast.error("Không lưu được lời nhắc. Vui lòng thử lại."),
    };
    if (reminder) updateReminder.mutate({ id: reminder.id, payload }, done);
    else createReminder.mutate(payload, done);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="flex h-[92vh] w-full max-w-[1360px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">Soạn lời nhắc · {deal.client}</div>
              <div className="text-xs text-muted-foreground">
                Xem trước đúng lá thư khách sẽ nhận trước khi đặt lịch
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <WindowControlButton icon={Minus} label="Thu nhỏ" onClick={onClose} />
            <WindowControlButton icon={X} label="Đóng" onClick={onClose} />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* CỘT TRÁI — cấu hình. Cuộn riêng nên dài bao nhiêu cũng không ăn chỗ xem trước. */}
          <aside className="flex max-h-[45%] shrink-0 flex-col gap-4 overflow-y-auto border-b border-border p-5 lg:max-h-none lg:w-[400px] lg:border-b-0 lg:border-r">
            <Field label="Loại nhắc">
              <select
                value={type}
                onChange={(event) => {
                  const next = event.target.value as ReminderType;
                  setType(next);
                  // Đổi loại nhắc cũng đổi mẫu — nhưng vẫn giữ nguyên chữ người dùng đã gõ.
                  if (isUntouchedTemplate(message, vars)) {
                    setMessage(reminderTemplate(next, vars, tone));
                  }
                }}
                className={selectClass}
              >
                {REMINDER_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            {/* Nhắc thanh toán mà thư không có chỗ nào chỉ cách trả tiền thì khách đọc xong
              vẫn phải nhắn lại hỏi số tài khoản. Chỉ hiện khi CHƯA đính ảnh nào — đính rồi
              thì coi như đã có mã QR. */}
            {needsPaymentInfo && images.length === 0 && (
              <p className="flex items-start gap-1.5 rounded-md bg-warning/10 p-2 text-xs leading-4 text-warning-foreground">
                <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Thư nhắc thanh toán này chưa có thông tin chuyển khoản. Bạn chèn ảnh{" "}
                  <strong>mã QR</strong> ở mục Nội dung bên dưới nhé.
                </span>
              </p>
            )}

            <Field label="Kênh gửi">
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value as ReminderChannel)}
                className={selectClass}
              >
                {CHANNELS.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                    disabled={item.value === "zalo" && !zaloConnected}
                  >
                    {item.value === "zalo" && !zaloConnected
                      ? `${item.label} (chưa kết nối)`
                      : item.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {channel === "zalo" && !zaloConnected
                  ? "Chưa kết nối Zalo OA. Vào Cài đặt hồ sơ › Zalo OA để kết nối."
                  : CHANNELS.find((item) => item.value === channel)?.hint}
              </span>
            </Field>

            {/* NGÀY GÕ KIỂU VIỆT + lịch bấm chọn, không dùng `datetime-local`: ô đó hiện
              theo locale của MÁY, máy cài tiếng Anh là ra mm/dd/yyyy — người Việt đọc
              "03/07" thành 3 tháng 7 rồi đặt nhầm lịch cả tháng.  #Huynh */}
            <Field label="Thời gian nhắc">
              <div className="grid grid-cols-[1fr_108px] gap-2">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    placeholder="dd/mm/yyyy"
                    className={cn(selectClass, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((open) => !open)}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Chọn ngày nhắc"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                  {calendarOpen && (
                    <div className="absolute left-0 top-[calc(100%+8px)] z-30 rounded-xl border border-border bg-popover p-1 shadow-lg">
                      <Calendar
                        mode="single"
                        selected={plannedAt ?? undefined}
                        locale={vi}
                        onSelect={(picked) => {
                          if (!picked) return;
                          setDate(formatDateForInput(picked));
                          setCalendarOpen(false);
                        }}
                      />
                    </div>
                  )}
                </div>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className={selectClass}
                />
              </div>
              {/* Mặc định là NGÀY MAI — không nói ra thì người dùng chỉ sửa mỗi giờ rồi
                tưởng gửi hôm nay, ngồi đợi mãi không thấy thư đi. */}
              {plannedAt ? (
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  → gửi {formatRelative(plannedAt.toISOString())}
                </span>
              ) : (
                <span className="mt-1 block text-[11px] text-destructive">
                  Ngày chưa đúng định dạng ngày/tháng/năm.
                </span>
              )}
            </Field>

            <div className="border-t border-border pt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Nội dung
              </div>
              <div className="mb-2 flex items-center gap-1.5">
                {/* Giọng văn — Phiếu SU26SE083 dòng 105. */}
                {(["formal", "friendly"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleTone(value)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
                      tone === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {value === "formal" ? "Trang trọng" : "Thân mật"}
                  </button>
                ))}
              </div>
              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleAi}
                  disabled={generateFollowUp.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {generateFollowUp.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  AI soạn tin
                </button>
                <button
                  type="button"
                  onClick={handleTemplate}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                >
                  <FileText className="h-3.5 w-3.5" /> Dùng mẫu có sẵn
                </button>
              </div>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={10}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* ẢNH CHÈN VÀO THƯ — mã QR chuyển khoản chụp sẵn, ảnh sản phẩm, mockup.
              Chỉ ảnh: hộp thư không phát được video, muốn gửi video thì dán link vào nội
              dung. Ảnh nằm THẲNG trong thân thư (cid:) chứ không phải tệp đính kèm phải
              bấm tải — khách mở ra là thấy mã QR ngay.  #Huynh */}
            <div className="border-t border-border pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Ảnh trong thư
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {images.length}/{MAX_IMAGES}
                </span>
              </div>

              {images.length > 0 && (
                <ul className="mb-2 grid grid-cols-3 gap-2">
                  {images.map((image) => (
                    <li
                      key={image.key}
                      className="group relative overflow-hidden rounded-md border border-border bg-secondary/40"
                    >
                      <div className="grid h-16 place-items-center px-1 text-center text-[10px] leading-tight text-muted-foreground">
                        <span className="line-clamp-3 break-all">{image.filename}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setImages((current) => current.filter((item) => item.key !== image.key))
                        }
                        aria-label={`Bỏ ảnh ${image.filename}`}
                        title={`Bỏ ảnh ${image.filename}`}
                        className="absolute right-1 top-1 grid size-5 place-items-center rounded bg-foreground/70 text-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <X className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                hidden
                onChange={(event) => {
                  void addImages(event.target.files);
                  // Xoá giá trị để chọn LẠI đúng tệp vừa bỏ ra vẫn kích hoạt `onChange`.
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || images.length >= MAX_IMAGES}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" />
                )}
                {images.length >= MAX_IMAGES ? "Đã đủ số ảnh tối đa" : "Chèn ảnh"}
              </button>
              <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                PNG · JPG · WEBP · GIF, mỗi ảnh tối đa 10MB. Video thì dán link vào nội dung —
                hộp thư không phát được video.
              </p>
            </div>
          </aside>

          {/* CỘT PHẢI — thư thật do server dựng. */}
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20 px-5 pb-4 pt-3">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Thư khách sẽ nhận
              </span>
              {previewLoading && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Đang dựng lại…
                </span>
              )}
            </div>
            {preview ? (
              <iframe
                title="Xem trước thư nhắc"
                srcDoc={preview}
                // `sandbox` KHÔNG kèm `allow-scripts`: tờ giấy là HTML/CSS thuần (hai template
                // Jinja không có thẻ <script> nào), nên chặn script trong khung là miễn phí. Giữ
                // `allow-same-origin` để trang cha còn chạm được `contentDocument` cho sửa tại chỗ.
                sandbox="allow-same-origin"
                className="min-h-0 w-full flex-1 rounded-lg border border-border bg-white"
              />
            ) : (
              <p className="flex-1 py-16 text-center text-sm text-muted-foreground">
                Chưa dựng được bản xem trước.
              </p>
            )}
          </section>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border bg-card p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !message.trim()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {reminder ? "Cập nhật lời nhắc" : "Đặt lịch nhắc"}
          </button>
        </div>
      </div>
    </div>
  );
}

const selectClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/** Mặc định: ngày mai, vào giờ freelancer đã chọn trong Cài đặt (không có thì 9h). */
function defaultWhen(
  reminder: ReminderRecord | null | undefined,
  hour: number | null,
): { date: string; time: string } {
  const date = reminder?.scheduled_at ? new Date(reminder.scheduled_at) : new Date();
  if (!reminder?.scheduled_at) {
    date.setDate(date.getDate() + 1);
    date.setHours(hour ?? 9, 0, 0, 0);
  }
  return { date: formatDateForInput(date), time: formatTimeForInput(date) };
}
