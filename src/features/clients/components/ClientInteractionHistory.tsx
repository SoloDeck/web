import { useMemo, useState } from "react";
import {
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

const CHANNEL_OPTIONS: { value: string; label: string; icon: typeof Mail }[] = [
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Gọi điện", icon: Phone },
  { value: "zalo", label: "Zalo", icon: MessagesSquare },
  { value: "meeting", label: "Gặp mặt", icon: Users },
  { value: "message", label: "Nhắn tin", icon: MessageSquare },
  { value: "other", label: "Khác", icon: MessageSquare },
];

const CHANNEL_MAP = new Map(CHANNEL_OPTIONS.map((opt) => [opt.value, opt]));

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

  const logs = useMemo(
    () =>
      [...(commLogsQuery.data ?? [])].sort((a, b) =>
        b.communicated_at.localeCompare(a.communicated_at)
      ),
    [commLogsQuery.data]
  );

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
        },
      }
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Lịch sử tương tác</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ghi lại các lần liên hệ với khách hàng qua email, điện thoại, Zalo...
          </p>
        </div>
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
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className={INPUT_CLASS}
              >
                {CHANNEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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

        {logs.map((log) => {
          const meta = CHANNEL_MAP.get(log.channel);
          const ChannelIcon = meta?.icon ?? MessageSquare;
          return (
            <div key={log.id} className="flex gap-3 rounded-lg border border-border px-3 py-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <ChannelIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">
                    {meta?.label ?? log.channel}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDateTime(log.communicated_at)}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{log.summary}</p>
              </div>
            </div>
          );
        })}

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
