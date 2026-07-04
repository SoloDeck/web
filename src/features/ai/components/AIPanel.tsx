import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BadgeCheck, Bot, CheckCircle2, Flame, Loader2, Minus, RefreshCw, Snowflake, Sun, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";
import type { Deal, LeadScore } from "@/features/deals/types";
import { useQualifyDeal, useTransitionDealStage } from "@/features/deals/hooks/useDeals";
import { addDealHistoryEntry } from "@/features/deals/dealHistoryStorage";
import { addDealQualificationDocument } from "@/features/deals/dealQualificationStorage";
import { cn } from "@/lib/utils";
import { formatVND } from "@/utils/format";
import { useAIActivityStore } from "@/features/ai/hooks/useAIActivityStore";

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

export function AIPanel({ open, deal, onClose }: { open: boolean; deal?: Deal | null; onClose: () => void }) {
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [errorHint, setErrorHint] = useState("");
  const [minimized, setMinimized] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const cancelledJobsRef = useRef(new Set<string>());
  const qualify = useQualifyDeal();
  const transitionStage = useTransitionDealStage();
  const upsertJob = useAIActivityStore((state) => state.upsertJob);
  const updateJob = useAIActivityStore((state) => state.updateJob);
  const removeJob = useAIActivityStore((state) => state.removeJob);
  const cancelJob = useAIActivityStore((state) => state.cancelJob);
  const viewRequestId = useAIActivityStore((state) => state.viewRequestId);
  const consumeViewRequest = useAIActivityStore((state) => state.consumeViewRequest);
  const jobId = deal ? `ai-qualify-${deal.id}` : "";

  function runQualification(currentDeal: Deal) {
    const currentJobId = `ai-qualify-${currentDeal.id}`;
    cancelledJobsRef.current.delete(currentJobId);
    setResult(null);
    setErrorHint("");
    setMinimized(true);
    upsertJob({
      id: currentJobId,
      kind: "deal_qualification",
      title: `Đánh giá ${currentDeal.projectType}`,
      description: "AI đang phân tích nhu cầu, ngân sách và tín hiệu từ deal.",
      entityLabel: currentDeal.client,
      status: "running",
    });
    toast.info("AI đang đánh giá deal ở nền. Bạn có thể tiếp tục thao tác màn hình khác.");
    qualify.mutate(currentDeal.id, {
      onSuccess: (data) => {
        if (cancelledJobsRef.current.has(currentJobId) || useAIActivityStore.getState().isJobCancelled(currentJobId)) return;
        const mapped = mapApiQualification(currentDeal, data);
        setResult(mapped);
        updateJob(currentJobId, {
          status: "success",
          description: `Đã có kết quả ${mapped.score}/100. Bấm Xem để kiểm tra và lưu đánh giá.`,
        });

        // Lưu vào lịch sử riêng của deal (cục bộ FE) — không dùng comm-logs của
        // client vì comm-logs là theo client_id nên các deal chung 1 client sẽ lẫn lịch sử.
        const levelLabel = mapped.level === "hot" ? "Nóng" : mapped.level === "cold" ? "Lạnh" : "Ấm";
        addDealHistoryEntry(currentDeal.id, {
          date: new Date().toISOString(),
          text: `AI đánh giá deal: ${mapped.score}/100 (${levelLabel}). ${mapped.rationale}`.slice(0, 500),
          channel: "message",
        });
      },
      onError: (error) => {
        if (cancelledJobsRef.current.has(currentJobId) || useAIActivityStore.getState().isJobCancelled(currentJobId)) return;
        const hint = getErrorHint(error);
        setErrorHint(hint);
        updateJob(currentJobId, {
          status: "error",
          description: "Không thể đánh giá deal bằng AI.",
          error: hint,
        });
        toast.error("Không thể đánh giá deal bằng AI. Vui lòng kiểm tra Network.");
      },
    });
  }

  useEffect(() => {
    if (!open || !deal) return;
    runQualification(deal);
    // Mutation object thay đổi theo render nên chỉ bám theo deal/open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id, open]);

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
    cancelledJobsRef.current.add(jobId);
    cancelJob(jobId);
    setCancelDialogOpen(false);
    setMinimized(true);
    toast.info("Đã hủy tác vụ AI trên giao diện. Nếu backend trả kết quả muộn, FE sẽ bỏ qua.");
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
            {qualify.isPending && (
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
              onClick={qualify.isPending ? () => setMinimized(true) : handleClose}
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

          {qualify.isPending && (
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

          {errorHint && !qualify.isPending && (
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
                  disabled={qualify.isPending || transitionStage.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {qualify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Đánh giá lại
                </button>
                <button
                  type="button"
                  onClick={saveAndMoveNext}
                  disabled={qualify.isPending || transitionStage.isPending}
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
