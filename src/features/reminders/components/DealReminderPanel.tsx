import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarClock, Loader2, Mail, Pencil, Send, Sparkles, Trash2, Zap } from "lucide-react";
import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";
import { FollowUpModal } from "@/features/ai/components/FollowUpModal";
import { ReminderComposerModal } from "@/features/reminders/components/ReminderComposerModal";
import type { Deal } from "@/features/deals/types";
import {
  useCancelReminder,
  useDealReminders,
  useSendReminderNow,
  useUpdateReminder,
} from "@/features/reminders/hooks/useReminders";
import type { ReminderChannel, ReminderRecord, ReminderType } from "@/services/remindersService";
import { cn } from "@/lib/utils";
import { formatDateForInput, formatTimeForInput } from "@/features/reminders/dateTime";

const REMINDER_TYPES: Array<{ value: ReminderType; label: string }> = [
  { value: "follow_up", label: "Hỏi thăm chung" },
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
  { value: "zalo", label: "Gửi Zalo cho khách", hint: "SoloDesk gửi tin nhắc qua Zalo OA của bạn (khách cần đã quan tâm OA)" },
];

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Đang chờ", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  sent: { label: "Đã gửi", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Gửi lỗi", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled: { label: "Đã hủy", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  skipped: { label: "Đã bỏ qua", cls: "bg-slate-50 text-slate-600 border-slate-200" },
};

/** Dòng phụ nói lời nhắc đang nhắc về cái gì, khi nó không nhắm thẳng vào deal. */
const TARGET_NOUN: Partial<Record<ReminderRecord["target_type"], string>> = {
  invoice: "Nhắc về hoá đơn của dự án",
  contract: "Nhắc về hợp đồng của dự án",
};

export function DealReminderPanel({
  deal,
  focusReminderId,
}: {
  deal: Deal;
  /** Lời nhắc cần làm nổi bật — tới từ thông báo trên chuông (`?reminder=` trên URL). */
  focusReminderId?: string;
}) {
  const remindersQuery = useDealReminders(deal.id);
  const updateReminder = useUpdateReminder(deal.id);
  const cancelReminder = useCancelReminder(deal.id);
  const sendNow = useSendReminderNow(deal.id);
  const [aiOpen, setAiOpen] = useState(false);
  /** Lời nhắc sắp GỬI NGAY cho khách — chờ người dùng xác nhận. */
  const [sendNowPending, setSendNowPending] = useState<ReminderRecord | null>(null);
  /** Lời nhắc sắp bị huỷ lịch — chờ người dùng xác nhận. */
  const [cancelPending, setCancelPending] = useState<ReminderRecord | null>(null);
  /** `null` = soạn mới; có bản ghi = sửa lời nhắc đó. `undefined` = cửa sổ đang đóng. */
  const [composerFor, setComposerFor] = useState<ReminderRecord | null | undefined>(undefined);
  const reminders = useMemo(
    () => [...(remindersQuery.data ?? [])].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
    [remindersQuery.data]
  );
  const pendingCount = reminders.filter((reminder) => reminder.status === "pending").length;


  /**
   * Hỏi lại ĐÚNG CHỖ, không hỏi ngược.
   *
   * Trước đây "Gửi ngay" — thư rời máy chủ tới khách hàng thật, không thu hồi được — thì im
   * lặng chạy luôn, còn "Hủy" — chỉ bỏ một lịch hẹn chưa gửi, soạn lại mất 30 giây — lại bị
   * chặn bằng `window.confirm` (khoá cứng cả tab, và câu hỏi cũng không nói mất gì).  #Huynh
   */
  function requestSendNow(reminder: ReminderRecord) {
    // Kênh "Chỉ nhắc tôi" không chạm tới khách: hỏi là thừa một cú bấm.
    if (reminder.channel === "in_app") {
      sendNow.mutate(reminder.id);
      return;
    }
    setSendNowPending(reminder);
  }

  return (
    /* MỘT CỘT, chiếm hết bề ngang. Cột phải trước đây là form "Tạo lịch nhắc mới", sau khi
      gom việc soạn về cửa sổ riêng thì nó chỉ còn là một tấm bảng chỉ đường — chiếm 340px
      để nói một câu, trong khi danh sách lịch nhắc mới là thứ người ta vào đây để xem.  #Huynh */
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Lịch nhắc của dự án</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
              {pendingCount} đang chờ
            </span>
            {/* MỘT cửa duy nhất để soạn: cửa sổ riêng 2 cột, có chọn giọng, có nút AI, có
                mẫu sẵn, và xem trước ĐÚNG lá thư khách nhận (kể cả khối QR + số tài khoản). */}
            <button
              type="button"
              onClick={() => setComposerFor(null)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <Sparkles className="h-3.5 w-3.5" /> Soạn lời nhắc
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
          {remindersQuery.isLoading && (
            <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Đang tải lịch nhắc...
            </div>
          )}

          {/* Danh sách ghép từ ba lượt gọi (lời nhắc, hoá đơn, hợp đồng). Hỏng một lượt mà rơi
              xuống "Chưa có lịch nhắc" thì người vừa bấm thông báo chờ duyệt tưởng không còn gì
              để duyệt — nói thẳng là tải lỗi và cho thử lại. */}
          {remindersQuery.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm">
              <p className="font-semibold text-destructive">Chưa tải được lịch nhắc của dự án.</p>
              <button
                type="button"
                onClick={() => void remindersQuery.refetch()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                Thử lại
              </button>
            </div>
          )}

          {!remindersQuery.isLoading && !remindersQuery.isError && reminders.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <h3 className="mt-3 text-sm font-semibold">Chưa có lịch nhắc</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tạo lịch nhắc để không bỏ sót việc hỏi thăm khách, báo giá, hợp đồng hoặc thanh toán.
              </p>
              {/* Nút ngay tại chỗ trống: bỏ cột phải rồi thì đây là chỗ mắt người dùng đang
                nhìn, bắt họ ngước lên góc trên tìm nút là thừa một bước.  #Huynh */}
              <button
                type="button"
                onClick={() => setComposerFor(null)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" /> Soạn lời nhắc
              </button>
            </div>
          )}

          {reminders.map((reminder) => (
            // Sửa cũng mở CỬA SỔ SOẠN, không còn đổ ngược vào form bên phải. BE chỉ cho
            // sửa lời nhắc đang chờ nên giao diện chặn trước cho dễ hiểu.
            <ReminderRow
              key={reminder.id}
              reminder={reminder}
              focused={reminder.id === focusReminderId}
              onEdit={() =>
                reminder.status === "pending" ? setComposerFor(reminder) : undefined
              }
              onCancel={() => setCancelPending(reminder)}
              onSendNow={() => requestSendNow(reminder)}
              busy={cancelReminder.isPending || updateReminder.isPending || sendNow.isPending}
            />
          ))}
        </div>
      </section>


      {/* FollowUpModal tự tạo lời nhắc + gửi qua React Query, nên đóng lại là danh sách
          bên trái tự cập nhật, không cần truyền callback. */}
      {aiOpen && <FollowUpModal deal={deal} onClose={() => setAiOpen(false)} />}
      {composerFor !== undefined && (
        <ReminderComposerModal
          deal={deal}
          reminder={composerFor}
          onClose={() => setComposerFor(undefined)}
        />
      )}

      <ConfirmDialog
        open={Boolean(sendNowPending)}
        onOpenChange={(open) => {
          if (!open) setSendNowPending(null);
        }}
        title={`Gửi cho ${deal.client} ngay bây giờ?`}
        description={
          sendNowPending
            ? `${channelNoun(sendNowPending.channel)} sẽ rời máy chủ ngay lập tức, không thu hồi được. ` +
              `Lịch hẹn ban đầu là ${formatDateTime(sendNowPending.scheduled_at)}.`
            : undefined
        }
        confirmLabel="Gửi"
        cancelLabel="Hủy"
        isLoading={sendNow.isPending}
        onConfirm={() => {
          if (!sendNowPending) return;
          sendNow.mutate(sendNowPending.id);
          setSendNowPending(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(cancelPending)}
        onOpenChange={(open) => {
          if (!open) setCancelPending(null);
        }}
        title="Bỏ lịch nhắc này?"
        description={
          cancelPending
            ? `Lời nhắc hẹn lúc ${formatDateTime(cancelPending.scheduled_at)} sẽ không gửi nữa. ` +
              "Bạn vẫn soạn được lời nhắc mới bất cứ lúc nào."
            : undefined
        }
        confirmLabel="Bỏ lịch nhắc"
        cancelLabel="Giữ lại"
        tone="danger"
        isLoading={cancelReminder.isPending}
        onConfirm={() => {
          if (!cancelPending) return;
          cancelReminder.mutate(cancelPending.id);
          setCancelPending(null);
        }}
      />
    </div>
  );
}

function ReminderRow({
  reminder,
  focused = false,
  onEdit,
  onCancel,
  onSendNow,
  busy,
}: {
  reminder: ReminderRecord;
  /** Người dùng vừa bấm thông báo về đúng lời nhắc này: cuộn tới và viền sáng. */
  focused?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSendNow: () => void;
  busy: boolean;
}) {
  const rowRef = useRef<HTMLElement>(null);
  // Chỉ đụng DOM, không đổi state — cuộn tới dòng được nhắc trong thông báo, kẻo nó nằm khuất
  // dưới cả chục lời nhắc khác và người dùng tưởng bấm vào không ra gì.
  useEffect(() => {
    if (focused) rowRef.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [focused]);
  const typeLabel = REMINDER_TYPES.find((type) => type.value === reminder.reminder_type)?.label ?? reminder.reminder_type;
  const channel = CHANNELS.find((item) => item.value === reminder.channel);
  const sendsToClient = reminder.channel === "email" || reminder.channel === "both";
  const relative = formatRelative(reminder.scheduled_at);

  return (
    <article
      ref={rowRef}
      data-focused={focused || undefined}
      className={cn(
        "rounded-xl border border-border p-4",
        focused && "border-primary ring-2 ring-primary/30"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", statusClass(reminder.status))}>
              {statusLabel(reminder.status)}
            </span>
            <ChannelBadge channel={normalizeChannel(reminder.channel)} label={channel?.label ?? reminder.channel} />
            {reminder.created_by_rule && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
                <Zap className="h-3 w-3" /> Tự động
              </span>
            )}
            {/* Lời nhắc chờ duyệt sẽ KHÔNG tự gửi dù đã tới giờ hẹn — không nói ra thì
                người dùng ngồi đợi mãi không thấy email. */}
            {reminder.requires_approval && reminder.status === "pending" && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                Chờ bạn duyệt
              </span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-semibold">{typeLabel}</h3>
          {TARGET_NOUN[reminder.target_type] && (
            <p className="text-xs text-muted-foreground">{TARGET_NOUN[reminder.target_type]}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(reminder.scheduled_at)}
            {/* Chờ duyệt thì KHÔNG hiện "còn X giờ nữa" — câu đó ngụ ý tới giờ là tự gửi,
                mà lời nhắc này sẽ nằm im cho tới khi người dùng bấm. Nhãn "Chờ bạn duyệt"
                ở trên mới là thứ nói đúng. */}
            {reminder.status === "pending" && !reminder.requires_approval && relative && (
              <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium">
                {relative}
              </span>
            )}
          </p>
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
          {/* Người tới đây TỪ chính thông báo đó thì bảo "xem ở chuông" là bắt họ quay lại. */}
          {focused
            ? "Sửa thông tin còn thiếu (thường là email hoặc Zalo của khách) rồi bấm “Soạn lời nhắc” để gửi lại."
            : "Xem lý do ở chuông thông báo — SoloDesk đã gửi cho bạn một thông báo kèm nguyên nhân."}
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


/** Thứ sắp rời máy chủ, gọi đúng tên để người dùng biết mình đang gửi cái gì. */
function channelNoun(channel: string): string {
  if (channel === "zalo") return "Tin nhắc qua Zalo";
  if (channel === "both") return "Email cho khách (và thông báo cho bạn)";
  return "Thư nhắc qua email";
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

/**
 * "còn bao lâu nữa" — thứ thiếu vắng khiến người dùng tưởng hệ thống hỏng.
 *
 * Ô ngày mặc định sẵn là NGÀY MAI, nên ai chỉ sửa giờ mà quên sửa ngày sẽ hẹn nhầm sang
 * hôm sau. Chỉ hiện "24/07/2026 14:22" thì không ai nhận ra; hiện thêm "còn 23 giờ nữa"
 * là thấy sai ngay lập tức.  #Huynh
 */
function formatRelative(value: string): string | null {
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;

  const minutes = Math.round((target - Date.now()) / 60000);
  if (minutes < 0) return "đã tới hạn, sẽ gửi trong ít phút";
  if (minutes < 1) return "sắp gửi";
  if (minutes < 60) return `còn ${minutes} phút nữa`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `còn ${hours} giờ nữa`;

  const days = Math.round(hours / 24);
  return days === 1 ? "còn 1 ngày nữa (ngày mai)" : `còn ${days} ngày nữa`;
}
