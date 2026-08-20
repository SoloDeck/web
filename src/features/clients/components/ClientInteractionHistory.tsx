import { useMemo, useState } from "react";
import {
  Briefcase,
  CalendarClock,
  Loader2,
  Mail,
  MessageSquare,
  MessagesSquare,
  Phone,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  useClientCommLogs,
  useCreateClientCommLog,
} from "@/features/clients/hooks/useClients";
import { useClientDeals, useDealHistories } from "@/features/deals/hooks/useDeals";
import { buildClientTimeline } from "@/features/clients/clientTimeline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pager } from "@/components/solodesk/Pager";
import { pageSlice } from "@/utils/paging";

const CHANNEL_OPTIONS: { value: string; label: string; icon: typeof Mail }[] = [
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Gọi điện", icon: Phone },
  { value: "zalo", label: "Zalo", icon: MessagesSquare },
  { value: "meeting", label: "Gặp mặt", icon: Users },
  { value: "message", label: "Nhắn tin", icon: MessageSquare },
  { value: "other", label: "Khác", icon: MessageSquare },
];

const CHANNEL_MAP = new Map(CHANNEL_OPTIONS.map((opt) => [opt.value, opt]));

const CHANNEL_ITEMS: Record<string, string> = Object.fromEntries(
  CHANNEL_OPTIONS.map((opt) => [opt.value, opt.label])
);

/**
 * Số dòng mỗi trang. Một khách chạy nhiều dự án là dòng thời gian dài rất nhanh.
 *
 * Để 7 chứ không phải 8: mỗi dòng cao ~94px, 8 dòng là đã đẩy nút chuyển trang xuống dưới
 * mép màn hình nên phải cuộn mới thấy — mà cuộn được rồi thì phân trang còn để làm gì.
 */
const DONG_MOI_TRANG = 7;

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-65";

/** Giá trị mặc định cho input datetime-local: thời điểm hiện tại theo giờ máy. */
function nowLocalInput(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ClientInteractionHistory({ clientId }: { clientId: string }) {
  const commLogsQuery = useClientCommLogs(clientId);
  const { mutate: createLog, isPending } = useCreateClientCommLog(clientId);

  const [showForm, setShowForm] = useState(false);
  const [channel, setChannel] = useState("email");
  const [summary, setSummary] = useState("");
  const [communicatedAt, setCommunicatedAt] = useState(nowLocalInput);
  const [page, setPage] = useState(1);

  // Dự án của khách này — nguồn thứ hai của dòng thời gian. Một khách có NHIỀU deal, nên mỗi
  // dòng phải nói rõ nó thuộc dự án nào.
  const dealsQuery = useClientDeals(clientId);
  const deals = useMemo(() => dealsQuery.data ?? [], [dealsQuery.data]);
  const dealIds = useMemo(() => deals.map((deal) => deal.id), [deals]);
  const dealHistories = useDealHistories(dealIds);

  const logs = useMemo(
    () =>
      buildClientTimeline({
        commLogs: commLogsQuery.data ?? [],
        deals,
        dealHistories,
      }),
    [commLogsQuery.data, deals, dealHistories]
  );

  const trangNay = useMemo(() => pageSlice(logs, page, DONG_MOI_TRANG), [logs, page]);

  function resetForm() {
    setChannel("email");
    setSummary("");
    setCommunicatedAt(nowLocalInput());
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!summary.trim()) {
      toast.error("Vui lòng nhập nội dung tương tác.");
      return;
    }
    createLog(
      {
        channel,
        summary: summary.trim(),
        communicated_at: new Date(communicatedAt).toISOString(),
      },
      {
        onSuccess: () => {
          resetForm();
          setShowForm(false);
          // Dòng vừa ghi nằm ở ĐẦU danh sách — về trang 1 để họ thấy ngay thứ mình vừa lưu.
          setPage(1);
        },
      }
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Không lặp lại tên — nhãn tab ngay trên đã ghi rồi. */}
        <p className="max-w-xl text-sm text-muted-foreground">
          Gộp việc bạn tự ghi với lịch sử tự động của từng dự án — gửi báo giá, khách chấp nhận,
          ký hợp đồng, thu tiền.
        </p>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
        >
          <Plus className="h-4 w-4" /> Ghi tương tác
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-3 rounded-lg border border-border bg-muted/30 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Kênh liên hệ</label>
              <Select
                items={CHANNEL_ITEMS}
                value={channel}
                onValueChange={(v) => v && setChannel(v)}
              >
                <SelectTrigger className={INPUT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Thời điểm</label>
              <input
                type="datetime-local"
                value={communicatedAt}
                onChange={(e) => setCommunicatedAt(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nội dung</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="Ví dụ: Gọi điện xác nhận phạm vi dự án, khách đồng ý mức giá..."
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending || !summary.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Lưu tương tác
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {commLogsQuery.isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lịch sử tương tác...
          </div>
        )}

        {trangNay.map((item) => {
          const meta = item.channel ? CHANNEL_MAP.get(item.channel) : undefined;
          const tuDuAn = item.source === "deal";
          const ChannelIcon = meta?.icon ?? (tuDuAn ? Briefcase : MessageSquare);
          return (
            <div key={item.id} className="flex gap-3 rounded-lg border border-border px-3 py-3">
              <div
                className={
                  tuDuAn
                    ? "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground"
                    : "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
                }
              >
                <ChannelIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {/* Nói rõ dòng này thuộc DỰ ÁN NÀO. Một khách chạy hai dự án song song mà
                    không có nhãn này thì dòng thời gian trộn thành một mớ không đọc được. */}
                  {tuDuAn ? (
                    <span className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border border-border px-2 py-0.5 font-medium text-foreground">
                      {item.dealTitle ?? "Dự án"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">
                      {meta?.label ?? item.channel ?? "Ghi chú"}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDateTime(item.at)}
                  </span>
                  {tuDuAn && (
                    <span className="text-[11px] text-muted-foreground/70">tự động</span>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{item.text}</p>
              </div>
            </div>
          );
        })}

        <Pager page={page} total={logs.length} pageSize={DONG_MOI_TRANG} onPage={setPage} />

        {!commLogsQuery.isLoading && logs.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <MessagesSquare className="mx-auto h-7 w-7 text-muted-foreground/60" />
            <p className="mt-2 text-sm text-muted-foreground">
              Chưa có lịch sử tương tác. Bấm "Ghi tương tác" để lưu lần liên hệ đầu tiên.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
