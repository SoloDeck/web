import { useMemo, useState } from "react";
import { Bell, CalendarClock, CalendarDays, Loader2, Mail, Pencil, Save, Send, Trash2, X } from "lucide-react";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import type { Deal } from "@/features/deals/types";
import {
  useCancelReminder,
  useCreateReminder,
  useDealReminders,
  useSendReminderNow,
  useUpdateReminder,
} from "@/features/reminders/hooks/useReminders";
import type { ReminderChannel, ReminderRecord, ReminderType } from "@/services/remindersService";
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

// Nhãn nói rõ HỆ QUẢ, không chỉ tên kênh: "Email" không cho biết thư đi tới ai, mà chọn
// nhầm thì hệ thống gửi thẳng cho khách hàng thật.  #Huynh
const CHANNELS: Array<{ value: ReminderChannel; label: string; hint: string }> = [
  { value: "in_app", label: "Chỉ nhắc tôi", hint: "Báo trong ứng dụng, không gửi gì cho khách" },
  { value: "email", label: "Gửi email cho khách", hint: "SoloDesk tự gửi email tới khách khi tới giờ" },
  { value: "both", label: "Gửi email + nhắc tôi", hint: "Vừa gửi khách vừa báo cho bạn" },
  { value: "zalo", label: "Zalo (chưa hỗ trợ)", hint: "Chưa nối được Zalo OA — hệ thống sẽ chỉ nhắc bạn tự nhắn" },
];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Đang chờ", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  sent: { label: "Đã gửi", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Gửi lỗi", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled: { label: "Đã hủy", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  skipped: { label: "Đã bỏ qua", cls: "bg-slate-50 text-slate-600 border-slate-200" },
};

type ReminderForm = {
  reminder_type: ReminderType;
  channel: ReminderChannel;
  scheduled_date: string;
  scheduled_time: string;
  message_preview: string;
};

export function DealReminderPanel({ deal }: { deal: Deal }) {
  const remindersQuery = useDealReminders(deal.id);
  const createReminder = useCreateReminder(deal.id);
  const updateReminder = useUpdateReminder(deal.id);
  const cancelReminder = useCancelReminder(deal.id);
  const sendNow = useSendReminderNow(deal.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [form, setForm] = useState<ReminderForm>(() => ({
    reminder_type: "follow_up",
    channel: "in_app",
    ...buildDefaultSchedule(),
    message_preview: buildReminderMessage("follow_up", deal),
  }));

  const reminders = useMemo(
    () => [...(remindersQuery.data ?? [])].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    [remindersQuery.data]
  );
  const pendingCount = reminders.filter((reminder) => reminder.status === "pending").length;

  function patchForm(patch: Partial<ReminderForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const scheduledAt = parseVietnameseDateTime(form.scheduled_date, form.scheduled_time);
    if (!scheduledAt) {
      toast.error("Vui lòng nhập ngày theo định dạng ngày/tháng/năm.");
      return;
    }

    const payload = {
      target_type: "deal",
      target_id: deal.id,
      reminder_type: form.reminder_type,
      channel: form.channel,
      scheduled_at: scheduledAt.toISOString(),
      message_preview: form.message_preview.trim() || null,
    } as const;

    if (editingId) {
      updateReminder.mutate(
        { id: editingId, payload },
        { onSuccess: () => resetForm() }
      );
      return;
    }

    createReminder.mutate(payload, { onSuccess: () => resetForm() });
  }

  function startEdit(reminder: ReminderRecord) {
    // BE chỉ cho sửa reminder đang pending theo rule domain, UI cũng chặn trước cho dễ hiểu.
    if (reminder.status !== "pending") return;
    setEditingId(reminder.id);
    setForm({
      reminder_type: reminder.reminder_type,
      channel: normalizeChannel(reminder.channel),
      scheduled_date: formatDateInput(reminder.scheduled_at),
      scheduled_time: formatTimeInput(reminder.scheduled_at),
      message_preview: reminder.message_preview ?? "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      reminder_type: "follow_up",
      channel: "in_app",
      ...buildDefaultSchedule(),
      message_preview: buildReminderMessage("follow_up", deal),
    });
  }

  function cancel(id: string) {
    const confirmed = window.confirm("Hủy lịch nhắc này?");
    if (!confirmed) return;
    cancelReminder.mutate(id);
  }

  const selectedDate = parseVietnameseDate(form.scheduled_date);

  return (
    <div className="grid h-full min-h-0 overflow-hidden gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Lịch nhắc của dự án</h2>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
            {pendingCount} đang chờ
          </span>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
          {remindersQuery.isLoading && (
            <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Đang tải lịch nhắc...
            </div>
          )}

          {!remindersQuery.isLoading && reminders.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <h3 className="mt-3 text-sm font-semibold">Chưa có lịch nhắc</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tạo lịch nhắc để không bỏ sót follow-up, báo giá, hợp đồng hoặc thanh toán.
              </p>
            </div>
          )}

          {reminders.map((reminder) => (
            <ReminderRow
              key={reminder.id}
              reminder={reminder}
              onEdit={() => startEdit(reminder)}
              onCancel={() => cancel(reminder.id)}
              onSendNow={() => sendNow.mutate(reminder.id)}
              busy={cancelReminder.isPending || updateReminder.isPending || sendNow.isPending}
            />
          ))}
        </div>
      </section>

      <form onSubmit={submit} className="h-full min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4 text-primary" />
          Tạo lịch nhắc mới
        </div>
        {editingId && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Đang sửa lịch nhắc. Lưu lại hoặc hủy sửa để tạo lịch mới.
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Loại nhắc</label>
            <select
              value={form.reminder_type}
              onChange={(event) => {
                const reminderType = event.target.value as ReminderType;
                patchForm({
                  reminder_type: reminderType,
                  message_preview: buildReminderMessage(reminderType, deal),
                });
              }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {REMINDER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Kênh nhắc</label>
            <select
              value={form.channel}
              onChange={(event) => patchForm({ channel: event.target.value as ReminderChannel })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {CHANNELS.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {CHANNELS.find((channel) => channel.value === form.channel)?.hint}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Thời gian nhắc</label>
            <div className="grid grid-cols-[1fr_108px] gap-2">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.scheduled_date}
                  onChange={(event) => patchForm({ scheduled_date: event.target.value })}
                  placeholder="dd/mm/yyyy"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                      selected={selectedDate ?? undefined}
                      locale={vi}
                      // Calendar chỉ phục vụ chọn ngày; giờ vẫn lấy từ input time bên cạnh.
                      onSelect={(date) => {
                        if (!date) return;
                        patchForm({ scheduled_date: formatDateForInput(date) });
                        setCalendarOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>
              <input
                type="time"
                value={form.scheduled_time}
                onChange={(event) => patchForm({ scheduled_time: event.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nội dung nhắc</label>
            <textarea
              value={form.message_preview}
              onChange={(event) => patchForm({ message_preview: event.target.value })}
              rows={5}
              placeholder="Nhập nội dung nhắc để freelancer xem lại trước khi liên hệ khách..."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={createReminder.isPending || updateReminder.isPending || !form.scheduled_date || !form.scheduled_time}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createReminder.isPending || updateReminder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {createReminder.isPending || updateReminder.isPending ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Lưu lịch nhắc"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            disabled={updateReminder.isPending}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Hủy sửa
          </button>
        )}
      </form>
    </div>
  );
}

function ReminderRow({
  reminder,
  onEdit,
  onCancel,
  onSendNow,
  busy,
}: {
  reminder: ReminderRecord;
  onEdit: () => void;
  onCancel: () => void;
  onSendNow: () => void;
  busy: boolean;
}) {
  const typeLabel = REMINDER_TYPES.find((type) => type.value === reminder.reminder_type)?.label ?? reminder.reminder_type;
  const channel = CHANNELS.find((item) => item.value === reminder.channel);
  const sendsToClient = reminder.channel === "email" || reminder.channel === "both";

  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", statusClass(reminder.status))}>
              {statusLabel(reminder.status)}
            </span>
            <ChannelBadge channel={normalizeChannel(reminder.channel)} label={channel?.label ?? reminder.channel} />
          </div>
          <h3 className="mt-2 text-sm font-semibold">{typeLabel}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(reminder.scheduled_at)}</p>
        </div>

        {reminder.status === "pending" && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onSendNow}
              disabled={busy}
              title={sendsToClient ? "Gửi email cho khách ngay bây giờ" : "Nhắc bạn ngay bây giờ"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Gửi ngay
            </button>
            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Sửa
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Hủy
            </button>
          </div>
        )}
      </div>

      {(reminder.status === "failed" || reminder.status === "skipped") && (
        <p className="mt-2 text-xs text-muted-foreground">
          Xem lý do ở chuông thông báo — SoloDesk đã gửi cho bạn một thông báo kèm nguyên nhân.
        </p>
      )}

      {reminder.message_preview && (
        <div className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
          {reminder.message_preview}
        </div>
      )}
    </article>
  );
}

function ChannelBadge({ channel, label }: { channel: ReminderChannel; label: string }) {
  if (channel === "zalo") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0068ff]">
        <span className="grid h-4 w-4 place-items-center rounded bg-[#0068ff] text-[8px] font-bold text-white">
          Z
        </span>
        {label}
      </span>
    );
  }

  // "both" cũng gửi email ra ngoài cho khách — dùng chung dấu hiệu với "email" để nhìn
  // là biết lời nhắc này có chạm tới khách hàng.
  if (channel === "email" || channel === "both") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
        <span className="grid h-4 w-4 place-items-center rounded bg-rose-50">
          <Mail className="h-3 w-3" />
        </span>
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
      <span className="grid h-4 w-4 place-items-center rounded bg-primary/10">
        <Bell className="h-3 w-3" />
      </span>
      {label}
    </span>
  );
}

function buildDefaultSchedule(): Pick<ReminderForm, "scheduled_date" | "scheduled_time"> {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return {
    scheduled_date: formatDateForInput(date),
    scheduled_time: formatTimeForInput(date),
  };
}

function buildReminderMessage(reminderType: ReminderType, deal: Deal): string {
  const typeLabel = REMINDER_TYPES.find((type) => type.value === reminderType)?.label ?? "Nhắc việc";
  return `${typeLabel} tới ${deal.client} - dự án "${deal.projectType}".`;
}

function formatDateInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return buildDefaultSchedule().scheduled_date;
  return formatDateForInput(date);
}

function formatTimeInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return buildDefaultSchedule().scheduled_time;
  return formatTimeForInput(date);
}

function formatDateForInput(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatTimeForInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseVietnameseDateTime(dateValue: string, timeValue: string): Date | null {
  const match = dateValue.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match || !timeValue) return null;
  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const [hourRaw, minuteRaw] = timeValue.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date;
}

function parseVietnameseDate(dateValue: string): Date | null {
  const match = dateValue.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return date;
}

function normalizeChannel(channel: string): ReminderChannel {
  if (channel === "email" || channel === "in_app" || channel === "zalo" || channel === "both") {
    return channel;
  }
  return "in_app";
}

function statusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status;
}

function statusClass(status: string): string {
  return STATUS_META[status]?.cls ?? "bg-secondary text-secondary-foreground border-border";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${formatDateForInput(date)} ${formatTimeForInput(date)}`;
}
