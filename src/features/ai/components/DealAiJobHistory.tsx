import { AlertCircle, CheckCircle2, Eye, Loader2, Sparkles } from "lucide-react";

import { useAiJobsForEntity } from "@/features/ai/hooks/useAIJobs";
import { getAiJobErrorMessage, isTerminal, type AiJob } from "@/services/aiJobsService";
import { cn } from "@/lib/utils";

/**
 * Các lần AI đã chấm điểm deal này, lấy thẳng từ backend.
 *
 * Vì sao cần: AI giờ chạy rất nhanh (~4 giây), nên rất dễ rơi vào cảnh job xong rồi
 * người dùng mới F5 — lúc đó kết quả biến mất khỏi màn hình và KHÔNG có cách nào mò
 * lại. Nhưng kết quả vẫn nằm trên backend (cột `result` của job), nên chỉ cần hỏi
 * lại là xem được, kể cả sau khi reload hay đổi máy.
 */
export function DealAiJobHistory({
  dealId,
  onView,
}: {
  dealId: string | undefined;
  onView: (jobId: string) => void;
}) {
  const { data: jobs, isLoading } = useAiJobsForEntity("deal", dealId, "lead_qualifier");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải lịch sử đánh giá AI...
      </div>
    );
  }

  if (!jobs?.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Đánh giá AI ({jobs.length})
      </div>

      {jobs.map((job) => (
        <AiJobRow key={job.id} job={job} onView={onView} />
      ))}
    </div>
  );
}

function AiJobRow({ job, onView }: { job: AiJob; onView: (jobId: string) => void }) {
  const running = !isTerminal(job.status);
  const succeeded = job.status === "succeeded";
  const score = succeeded
    ? ((job.result?.ai_qualification_score as number | undefined) ?? null)
    : null;

  const { Icon, iconClass, label } = running
    ? { Icon: Loader2, iconClass: "text-primary animate-spin", label: "Đang chạy" }
    : succeeded
      ? { Icon: CheckCircle2, iconClass: "text-success", label: "Hoàn tất" }
      : job.status === "cancelled"
        ? { Icon: AlertCircle, iconClass: "text-muted-foreground", label: "Đã hủy" }
        : { Icon: AlertCircle, iconClass: "text-destructive", label: "Thất bại" };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium">{label}</span>
          {score !== null && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold tabular-nums">
              {score}/100
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(job.created_at).toLocaleString("vi-VN")}
          </span>
        </div>

        {job.status === "failed" && (
          <p className="mt-1 text-xs text-destructive">{getAiJobErrorMessage(job)}</p>
        )}
      </div>

      {/* Chỉ cho xem lại job đã có kết quả — job hỏng thì không có gì để mở. */}
      {succeeded && (
        <button
          type="button"
          onClick={() => onView(job.id)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-secondary"
        >
          <Eye className="h-3.5 w-3.5" />
          Xem
        </button>
      )}
    </div>
  );
}
