import { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";
import { cn } from "@/lib/utils";
import { useAIActivityStore, type AIJob, type AIJobKind } from "@/features/ai/hooks/useAIActivityStore";

const KIND_LABEL: Record<AIJobKind, string> = {
  deal_qualification: "Đánh giá deal",
  proposal_generation: "Tạo báo giá",
  contract_generation: "Tạo hợp đồng",
};

function statusLabel(job: AIJob) {
  if (job.status === "running") return "Đang chạy nền";
  if (job.status === "success") return "Đã xong";
  return "Cần kiểm tra";
}

export function AIActivityCenter() {
  const [cancelTarget, setCancelTarget] = useState<AIJob | null>(null);
  const jobs = useAIActivityStore((state) => state.jobs);
  const requestView = useAIActivityStore((state) => state.requestView);
  const removeJob = useAIActivityStore((state) => state.removeJob);
  const cancelJob = useAIActivityStore((state) => state.cancelJob);
  const clearFinished = useAIActivityStore((state) => state.clearFinished);

  if (jobs.length === 0) return null;

  const runningCount = jobs.filter((job) => job.status === "running").length;
  const finishedCount = jobs.length - runningCount;

  function confirmCancelJob() {
    if (!cancelTarget) return;
    cancelJob(cancelTarget.id);
    setCancelTarget(null);
    toast.info("Đã hủy tác vụ AI trên giao diện. Nếu backend trả kết quả muộn, FE sẽ bỏ qua.");
  }

  return (
    <>
    <aside className="fixed bottom-5 right-5 z-40 w-[min(360px,calc(100vw-24px))] rounded-xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">Tác vụ AI</div>
            <div className="truncate text-xs text-muted-foreground">
              {runningCount > 0 ? `${runningCount} tác vụ đang chạy` : "Không còn tác vụ đang chạy"}
            </div>
          </div>
        </div>
        {finishedCount > 0 && (
          <button
            type="button"
            onClick={clearFinished}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Dọn xong
          </button>
        )}
      </div>

      <div className="max-h-[320px] space-y-2 overflow-y-auto p-3">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                  job.status === "running" && "bg-primary/10 text-primary",
                  job.status === "success" && "bg-emerald-50 text-emerald-600",
                  job.status === "error" && "bg-destructive/10 text-destructive"
                )}
              >
                {job.status === "running" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : job.status === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-semibold text-foreground">{job.title}</div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      job.status === "running" && "bg-primary/10 text-primary",
                      job.status === "success" && "bg-emerald-50 text-emerald-600",
                      job.status === "error" && "bg-destructive/10 text-destructive"
                    )}
                  >
                    {statusLabel(job)}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{KIND_LABEL[job.kind]}</div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {job.error || job.description}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => requestView(job.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-secondary"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Xem
                  </button>
                  {job.status === "running" ? (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(job)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-destructive/20 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-3.5 w-3.5" />
                      Hủy
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeJob(job.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Ẩn tác vụ"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
    <ConfirmDialog
      open={Boolean(cancelTarget)}
      onOpenChange={(open) => {
        if (!open) setCancelTarget(null);
      }}
      title="Hủy tác vụ AI?"
      description={
        cancelTarget
          ? `Tác vụ "${cancelTarget.title}" sẽ bị ẩn và FE sẽ bỏ qua kết quả trả về muộn.`
          : undefined
      }
      confirmLabel="Hủy tác vụ"
      cancelLabel="Tiếp tục chờ"
      tone="danger"
      onConfirm={confirmCancelJob}
    />
    </>
  );
}
