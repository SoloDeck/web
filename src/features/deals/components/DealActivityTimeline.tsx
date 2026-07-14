import { Clock, Eye, Loader2, Sparkles } from "lucide-react";

import { useAiJobsForEntity } from "@/features/ai/hooks/useAIJobs";
import { getAiJobErrorMessage, isTerminal, type AiJob } from "@/services/aiJobsService";
import { cn } from "@/lib/utils";

export type HistoryEntry = {
  id?: string;
  date: string;
  text: string;
  channel?: string;
};

type TimelineItem = {
  key: string;
  date: string;
  text: string;
  channel?: string;
  /** Chỉ có ở các lần chấm điểm AI — dùng để mở lại kết quả. */
  job?: AiJob;
};

/**
 * Một dòng thời gian DUY NHẤT cho deal: các lần AI chấm điểm (lấy từ backend) và
 * các hoạt động khác (soạn báo giá, tải PDF, gửi khách...) trộn chung, xếp theo
 * thời gian.
 *
 * Trước đây tôi để hai danh sách tách rời — "Đánh giá AI" ở trên, "Hoạt động" ở
 * dưới — nên người dùng phải nhìn hai chỗ mới dựng lại được câu chuyện của deal,
 * mà hai chỗ lại còn kể trùng nhau.
 */
export function DealActivityTimeline({
  dealId,
  historyItems,
  onViewJob,
}: {
  dealId: string | undefined;
  historyItems: HistoryEntry[];
  onViewJob: (jobId: string) => void;
}) {
  const { data: jobs, isLoading } = useAiJobsForEntity("deal", dealId, "lead_qualifier");

  const jobItems: TimelineItem[] = (jobs ?? []).map((job) => ({
    key: job.id,
    date: job.created_at,
    text: aiJobText(job),
    job,
  }));

  const historyEntries: TimelineItem[] = historyItems
    // Bỏ mấy dòng "AI đánh giá deal: 50/100" cũ còn sót trong localStorage: giờ các
    // lần chấm điểm đã lấy thẳng từ backend, giữ lại là kể trùng.
    .filter((item) => !item.text.startsWith("AI đánh giá deal:"))
    .map((item, index) => ({
      key: item.id ?? `history-${index}`,
      date: item.date,
      text: item.text,
      channel: item.channel,
    }));

  const items = [...jobItems, ...historyEntries].sort((a, b) => b.date.localeCompare(a.date));

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải hoạt động...
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Hoạt động ({items.length})
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Chưa có hoạt động nào trên deal này.
        </div>
      ) : (
        // Khung cuộn phải là thẻ bọc ngoài, KHÔNG phải chính thẻ <ol>: overflow-y-auto
        // kéo theo overflow-x thành auto, mà chấm tròn thì nhô ra bên trái <ol> nên bị
        // xén mất một nửa. Chừa pl-2 để chấm có chỗ nhô ra mà vẫn nằm trong khung cuộn.
        <div className="max-h-[26rem] overflow-y-auto pl-2 pr-2">
          <ol className="space-y-4 border-l-2 border-border pl-4">
            {items.map((item) => (
              <li key={item.key} className="relative">
                <span
                  className={cn(
                    "absolute -left-[21px] top-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-card",
                    item.job ? "bg-primary" : "bg-muted-foreground/50"
                  )}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {item.job && <Sparkles className="h-3 w-3 shrink-0 text-primary" />}
                      {formatWhen(item.date)}
                      {item.channel && !item.job && <span>· {item.channel}</span>}
                    </div>
                    <div className="mt-1 text-sm">{item.text}</div>
                  </div>

                  {/* Chỉ lần chấm điểm đã có kết quả mới mở lại được */}
                  {item.job?.status === "succeeded" && (
                    <button
                      type="button"
                      onClick={() => onViewJob(item.job!.id)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-secondary"
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                      Xem
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function aiJobText(job: AiJob): string {
  if (!isTerminal(job.status)) return "AI đang chấm điểm deal...";

  if (job.status === "succeeded") {
    const score = job.result?.ai_qualification_score as number | undefined;
    return score != null ? `AI đã chấm điểm deal: ${score}/100.` : "AI đã chấm điểm xong deal.";
  }
  if (job.status === "cancelled") return "Đã hủy lần chấm điểm AI.";

  return `AI chấm điểm deal thất bại. ${getAiJobErrorMessage(job) ?? ""}`.trim();
}

function formatWhen(value: string): string {
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
