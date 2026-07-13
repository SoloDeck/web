import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, Bot, CheckCircle2, Flame, Loader2, Minus, RefreshCw, Snowflake, Sun, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";
import type { Deal, LeadScore } from "@/features/deals/types";
import { useTransitionDealStage } from "@/features/deals/hooks/useDeals";
import { addDealHistoryEntry } from "@/features/deals/dealHistoryStorage";
import { addDealQualificationDocument } from "@/features/deals/dealQualificationStorage";
import { cn } from "@/lib/utils";
import { formatVND } from "@/utils/format";
import { useAIActivityStore } from "@/features/ai/hooks/useAIActivityStore";
import { useCancelAiJob, useCreateAiJob, useAiJob } from "@/features/ai/hooks/useAIJobs";
import { getAiJobErrorMessage, isTerminal } from "@/services/aiJobsService";

type EvaluationResult = {
  level: LeadScore;
  score: number;
  label: string;
  rationale: string;
  signals: string[];
  recommendation: string;
  priceLow: number;
  priceHigh: number;
  nextActions: string[];
};

type ApiQualificationResult = {
  project_type?: string | null;
  budget_signal?: string | null;
  timeline_signal?: string | null;
  urgency_signal?: string | null;
  red_flags?: string[] | null;
  suggested_lead_score?: string | null;
  reasoning?: string | null;
  ai_qualification_score?: number | null;
  ai_qualification_recommendation?: string | null;
};

const LEVEL_UI: Record<
  LeadScore,
  {
    label: string;
    icon: typeof Flame;
    badgeClass: string;
    scoreClass: string;
  }
> = {
  hot: {
    label: "Nóng",
    icon: Flame,
    badgeClass: "border-red-200 bg-red-50 text-red-600",
    scoreClass: "text-red-600",
  },
  warm: {
    label: "Ấm",
    icon: Sun,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    scoreClass: "text-amber-700",
  },
  cold: {
    label: "Lạnh",
    icon: Snowflake,
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    scoreClass: "text-blue-700",
  },
};

function mapApiQualification(deal: Deal, data: ApiQualificationResult): EvaluationResult {
  const score = data.ai_qualification_score ?? deal.aiQualificationScore ?? 50;
  const rawLevel = (data.suggested_lead_score ?? "").toLowerCase();
  const level: LeadScore =
    rawLevel === "hot" || score >= 75 ? "hot" : rawLevel === "cold" || score < 45 ? "cold" : "warm";
  const base = deal.value > 0 ? deal.value : 8_000_000;
  // Gom tín hiệu backend thành danh sách ngắn để Freelancer dễ đọc.
  const signals = [
    data.project_type ? `Loại dự án: ${data.project_type}` : null,
    data.budget_signal ? `Ngân sách: ${data.budget_signal}` : null,
    data.timeline_signal ? `Timeline: ${data.timeline_signal}` : null,
    data.urgency_signal ? `Độ gấp: ${data.urgency_signal}` : null,
    ...(data.red_flags?.length ? data.red_flags.map((flag) => `Lưu ý: ${flag}`) : []),
  ].filter(Boolean) as string[];

  return {
    level,
    score,
    label: LEVEL_UI[level].label,
    rationale: data.reasoning || "Backend đã đánh giá deal nhưng chưa trả phần giải thích chi tiết.",
    signals: signals.length ? signals : ["Backend chưa trả tín hiệu chi tiết cho deal này."],
    recommendation:
      data.ai_qualification_recommendation === "pass"
        ? "Nên tiếp tục tư vấn và chuyển sang bước báo giá khi đã xác nhận phạm vi."
        : data.ai_qualification_recommendation === "reject"
          ? "Nên cân nhắc loại bỏ hoặc hỏi lại để tránh mất thời gian tư vấn sai nhu cầu."
          : "Nên hỏi thêm phạm vi, ngân sách và timeline trước khi tạo báo giá.",
    priceLow: Math.round(base * 0.9),
    priceHigh: Math.round(base * 1.25),
    nextActions:
      level === "hot"
        ? ["Nhắn Zalo hoặc email trong hôm nay", "Xác nhận scope chính", "Tạo báo giá sau khi đủ thông tin"]
        : ["Hỏi thêm phạm vi công việc", "Xác nhận ngân sách và timeline", "Cập nhật deal sau khi khách phản hồi"],
  };
}

function getErrorHint(error: unknown): string {
  const err = error as { code?: string; response?: { status?: number; data?: { message?: string; detail?: string } } };
  if (err.code === "ECONNABORTED") {
    return "FE đã chờ quá lâu và request bị timeout. Hãy kiểm tra backend AI hoặc thử lại sau.";
  }
  if (err.response?.status) {
    const message = err.response.data?.message || err.response.data?.detail;
    return `Backend trả lỗi ${err.response.status}${message ? `: ${message}` : "."}`;
  }
  return "Request bị hủy hoặc backend không phản hồi. Hãy mở Network để xem dòng qualify.";
}

export function AIPanel({
  open,
  deal,
  onClose,
  /**
   * Mở để XEM LẠI một job đã chạy, thay vì chạy job mới.
   *
   * Dùng khi bấm "Xem" ở tab Lịch sử: kết quả AI nằm trên backend nên xem lại được
   * kể cả sau khi F5 — trước đây reload là mất, không mò lại được.
   */
  viewJobId,
}: {
  open: boolean;
  deal?: Deal | null;
  onClose: () => void;
  viewJobId?: string | null;
}) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [createError, setCreateError] = useState("");

  // job_id THẬT do backend cấp (POST /ai/jobs), không còn là chuỗi tự chế.
  // Xem lại job cũ thì dùng thẳng viewJobId — SUY RA chứ không set state trong
  // effect (vừa gây render dây chuyền, vừa bị eslint chặn).
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const jobId = viewJobId ?? createdJobId;

  // Chạy job mới → thu nhỏ để người dùng làm việc khác. Xem lại job cũ → mở sẵn,
  // vì họ bấm "Xem" chính là để nhìn kết quả ngay.
  const [minimizedOverride, setMinimizedOverride] = useState<boolean | null>(null);
  const minimized = minimizedOverride ?? !viewJobId;
  const setMinimized = setMinimizedOverride;

  const createJob = useCreateAiJob();
  const cancelJobApi = useCancelAiJob();
  const { data: job } = useAiJob(jobId ?? undefined);

  const transitionStage = useTransitionDealStage();
  const upsertJob = useAIActivityStore((state) => state.upsertJob);
  const updateJob = useAIActivityStore((state) => state.updateJob);
  const removeJob = useAIActivityStore((state) => state.removeJob);
  const viewRequestId = useAIActivityStore((state) => state.viewRequestId);
  const consumeViewRequest = useAIActivityStore((state) => state.consumeViewRequest);

  // Kết quả và lỗi được SUY RA từ job, không lưu thành state riêng. Nhờ vậy sau khi
  // F5 và khôi phục lại job, màn hình tự hiện đúng — không cần đồng bộ tay.
  const result: EvaluationResult | null = useMemo(() => {
    if (!deal || job?.status !== "succeeded" || !job.result) return null;
    return mapApiQualification(deal, job.result as ApiQualificationResult);
  }, [deal, job]);

  const errorHint =
    createError || (job?.status === "failed" ? (getAiJobErrorMessage(job) ?? "") : "");

  // Đang chạy = đang tạo job, hoặc job có rồi nhưng chưa vào trạng thái kết thúc.
  const isRunning = createJob.isPending || Boolean(job && !isTerminal(job.status));

  function runQualification(currentDeal: Deal) {
    setCreateError("");
    setCreatedJobId(null);
    setMinimized(true);

    createJob.mutate(
      { entity_id: currentDeal.id, type: "lead_qualifier", entity_type: "deal" },
      {
        onSuccess: (created) => {
          // BE tự trả lại job đang chạy nếu deal này đã có job cùng loại — nên gọi
          // lại sau F5 sẽ NHẬN LẠI ĐÚNG JOB CŨ thay vì đẻ thêm job mới.
          setCreatedJobId(created.id);
          upsertJob({
            id: created.id,
            kind: "deal_qualification",
            title: `Đánh giá ${currentDeal.projectType}`,
            description: "AI đang phân tích nhu cầu, ngân sách và tín hiệu từ deal.",
            entityLabel: currentDeal.client,
            status: "running",
            remote: true, // job thật của BE → Task Center huỷ được bằng API
          });
          toast.info("AI đang đánh giá deal ở nền. Bạn có thể tiếp tục thao tác màn hình khác.");
        },
        onError: (error) => {
          const hint = getErrorHint(error);
          setCreateError(hint);
          toast.error("Không tạo được tác vụ AI. Vui lòng thử lại.");
        },
      }
    );
  }

  useEffect(() => {
    // Mở để XEM LẠI job cũ (viewJobId) → không chạy AI lại, tránh tốn quota và tránh
    // đè mất kết quả mà người dùng đang muốn xem. jobId và minimized đã được suy ra
    // từ viewJobId ở trên nên không cần set gì ở đây.
    if (!open || !deal || viewJobId) return;

    runQualification(deal);
    // Mutation object thay đổi theo render nên chỉ bám theo deal/open/viewJobId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id, open, viewJobId]);

  // Đồng bộ trạng thái job thật sang Task Center (store ngoài React) mỗi khi
  // backend báo job đổi trạng thái.
  const loggedJobRef = useRef<string | null>(null);
  useEffect(() => {
    if (!job || !deal) return;

    if (job.status === "succeeded" && result) {
      updateJob(job.id, {
        status: "success",
        description: `Đã có kết quả ${result.score}/100. Bấm Xem để kiểm tra và lưu đánh giá.`,
      });

      // Chỉ ghi lịch sử một lần cho mỗi job, không thì mỗi lần poll lại ghi thêm.
      if (loggedJobRef.current !== job.id) {
        loggedJobRef.current = job.id;
        const levelLabel = result.level === "hot" ? "Nóng" : result.level === "cold" ? "Lạnh" : "Ấm";
        addDealHistoryEntry(deal.id, {
          date: new Date().toISOString(),
          text: `AI đánh giá deal: ${result.score}/100 (${levelLabel}). ${result.rationale}`.slice(0, 500),
          channel: "message",
        });
      }
    } else if (job.status === "failed") {
      updateJob(job.id, {
        status: "error",
        description: "Không thể đánh giá deal bằng AI.",
        error: getAiJobErrorMessage(job) ?? undefined,
      });
    } else if (job.status === "cancelled") {
      removeJob(job.id);
    }
  }, [job, deal, result, updateJob, removeJob]);

  useEffect(() => {
    if (!open || !deal || !jobId || viewRequestId !== jobId) return;
    setMinimized(false);
    consumeViewRequest(jobId);
  }, [consumeViewRequest, deal, jobId, open, viewRequestId]);

  function saveAndMoveNext() {
    if (!deal) return;
    if (!result) {
      toast.error("Chưa có kết quả đánh giá để lưu.");
      return;
    }
    const saveDocument = () => {
      addDealQualificationDocument(deal.id, {
        score: result.score,
        level: result.level,
        label: result.label,
        rationale: result.rationale,
        recommendation: result.recommendation,
        signals: result.signals,
      });
    };
    if (deal.stage !== "new_lead") {
      saveDocument();
      toast.success("Đánh giá đã được lưu vào tab Tài liệu.");
      if (jobId) removeJob(jobId);
      onClose();
      return;
    }
    transitionStage.mutate(
      { id: deal.id, stage: "qualified" },
      {
        onSuccess: () => {
          saveDocument();
          toast.success("Đã lưu đánh giá AI vào tab Tài liệu.");
          if (jobId) removeJob(jobId);
          onClose();
        },
      }
    );
  }

  function handleClose() {
    if (jobId) removeJob(jobId);
    onClose();
  }

  function confirmCancelAI() {
    if (!jobId) return;
    setCancelDialogOpen(false);
    setMinimized(true);

    // Huỷ THẬT ở backend, không chỉ giấu đi trên giao diện như trước.
    cancelJobApi.mutate(jobId, {
      onSuccess: () => {
        removeJob(jobId);
        // BE nói rõ: huỷ là best-effort. Worker đang gọi LLM thì không kill giữa
        // chừng được — nó chỉ kiểm tra cờ rồi bỏ qua kết quả. Đừng hứa "dừng ngay".
        toast.info("Đã yêu cầu hủy tác vụ AI. Kết quả (nếu có) sẽ bị bỏ qua.");
      },
      onError: () => {
        toast.error("Không hủy được tác vụ. Có thể nó vừa chạy xong.");
      },
    });
    onClose();
  }

  const levelUi = useMemo(() => (result ? LEVEL_UI[result.level] : LEVEL_UI.warm), [result]);
  const ScoreIcon = levelUi.icon;

  if (!open || !deal || minimized) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4 animate-in fade-in">
        <div className="pointer-events-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">Đánh giá deal bằng AI</div>
              <div className="text-xs text-muted-foreground">Phân tích dữ liệu deal và lưu điểm đánh giá vào hệ thống</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isRunning && (
              <button
                type="button"
                onClick={() => setCancelDialogOpen(true)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                Hủy tác vụ
              </button>
            )}
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Minus className="h-3.5 w-3.5" />
              Thu nhỏ
            </button>
            <button
              type="button"
              onClick={isRunning ? () => setMinimized(true) : handleClose}
              className="rounded-md p-1.5 hover:bg-secondary"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-4 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deal đang đánh giá</div>
              <h2 className="mt-1 text-lg font-bold text-foreground">{deal.projectType}</h2>
              <div className="mt-1 text-sm text-muted-foreground">{deal.client}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <InfoBlock label="Ngân sách" value={deal.budgetLabel || formatVND(deal.value)} />
              <InfoBlock label="Kênh" value={deal.channel} />
            </div>
          </div>

          {isRunning && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">AI đang đánh giá deal...</div>
                  <div className="text-sm text-muted-foreground">Quá trình này có thể mất vài chục giây nếu AI đang xử lý chậm.</div>
                </div>
              </div>
            </div>
          )}

          {errorHint && !isRunning && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <div className="font-semibold text-destructive">Chưa đánh giá được deal</div>
              <p className="mt-1 text-muted-foreground">{errorHint}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Nơi xem lỗi: DevTools → Network → request tên `qualify` → tab Response/Timing, hoặc terminal Docker backend.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Điểm đánh giá</div>
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", levelUi.badgeClass)}>
                      <ScoreIcon className="h-3.5 w-3.5" />
                      {result.label}
                    </span>
                  </div>
                  <div className={cn("mt-4 text-5xl font-black leading-none", levelUi.scoreClass)}>{result.score}</div>
                  <div className="mt-1 text-sm text-muted-foreground">/ 100 điểm tiềm năng</div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    Kết luận AI
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.rationale}</p>
                  <div className="mt-4 rounded-lg bg-primary/5 p-3 text-sm font-medium text-primary">
                    {result.recommendation}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="text-sm font-semibold">Tín hiệu backend phát hiện</div>
                  <div className="mt-3 space-y-2">
                    {result.signals.map((signal) => (
                      <div key={signal} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        <span>{signal}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="text-sm font-semibold">Hành động đề xuất</div>
                  <div className="mt-3 space-y-2">
                    {result.nextActions.map((action) => (
                      <div key={action} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-muted/30 p-4">
                <button
                  type="button"
                  onClick={() => runQualification(deal)}
                  disabled={isRunning || transitionStage.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Đánh giá lại
                </button>
                <button
                  type="button"
                  onClick={saveAndMoveNext}
                  disabled={isRunning || transitionStage.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {transitionStage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {deal.stage === "new_lead" ? "Lưu & chuyển sang Đã đánh giá" : "Lưu đánh giá"}
                </button>
              </div>

              <div className="hidden rounded-xl border border-border bg-muted/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Khoảng giá gợi ý</div>
                <div className="mt-1 text-xl font-bold text-primary">
                  {formatVND(result.priceLow)} - {formatVND(result.priceHigh)}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Hủy tác vụ AI?"
        description="SoloDesk sẽ ẩn tác vụ này và bỏ qua kết quả nếu backend trả về sau đó. Khi backend có API job thật, thao tác này sẽ gọi cancel job."
        confirmLabel="Hủy tác vụ"
        cancelLabel="Tiếp tục chờ"
        tone="danger"
        onConfirm={confirmCancelAI}
      />
    </>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
