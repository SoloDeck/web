import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Bot, CheckCircle2, Flame, Loader2, Snowflake, Sun, X } from "lucide-react";
import type { Deal, LeadScore } from "@/features/deals/types";
import { cn } from "@/lib/utils";
import { formatVND } from "@/utils/format";

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

function mockEvaluateDeal(deal: Deal): EvaluationResult {
  const text = [deal.projectType, deal.notes, deal.aiQualificationRecommendation].join(" ").toLowerCase();
  const hasBudget = deal.value > 0;
  const urgent = /gấp|urgent|asap|ngay|tuần|deadline|sớm/.test(text);
  const hasDetail = deal.notes.trim().length > 24;
  const hasContact = Boolean(deal.clientPhone || deal.clientEmail);

  // Tạm mô phỏng kết quả để UI giống flow API thật. Khi backend sẵn sàng, thay hàm này bằng request theo deal.id.
  const score = Math.min(
    95,
    Math.max(
      35,
      (deal.aiQualificationScore ?? 42) +
        (hasBudget ? 18 : 0) +
        (urgent ? 14 : 0) +
        (hasDetail ? 12 : 0) +
        (hasContact ? 8 : 0)
    )
  );

  const level: LeadScore = score >= 75 ? "hot" : score >= 55 ? "warm" : "cold";
  const base = deal.value > 0 ? deal.value : 8_000_000;

  return {
    level,
    score,
    label: LEVEL_UI[level].label,
    rationale:
      level === "hot"
        ? "Deal có tín hiệu tốt: khách đã có thông tin liên hệ, ngân sách hoặc mô tả đủ rõ để ưu tiên tư vấn sớm."
        : level === "warm"
        ? "Deal có tiềm năng nhưng vẫn cần hỏi thêm về phạm vi, deadline hoặc ngân sách trước khi báo giá chi tiết."
        : "Deal còn thiếu dữ liệu quan trọng. Nên sàng lọc thêm để tránh mất thời gian tư vấn sai nhu cầu.",
    signals: [
      hasContact ? "Có thông tin liên hệ" : "Thiếu kênh liên hệ rõ ràng",
      hasBudget ? `Ngân sách khách nhập: ${formatVND(deal.value)}` : "Chưa có ngân sách",
      hasDetail ? "Mô tả nhu cầu đủ ngữ cảnh" : "Mô tả nhu cầu còn ngắn",
      urgent ? "Có dấu hiệu cần xử lý sớm" : "Chưa thấy deadline rõ",
    ],
    recommendation:
      level === "hot"
        ? "Nên phản hồi trong hôm nay, xác nhận scope chính và chuyển nhanh sang bước báo giá."
        : level === "warm"
        ? "Nên gửi 2-3 câu hỏi sàng lọc trước khi tạo báo giá để tránh lệch phạm vi."
        : "Nên nhắn hỏi lại nhu cầu, ngân sách và timeline trước khi đầu tư thời gian làm proposal.",
    priceLow: Math.round(base * 0.9),
    priceHigh: Math.round(base * 1.25),
    nextActions:
      level === "hot"
        ? ["Nhắn Zalo hoặc email trong hôm nay", "Tạo báo giá AI sau khi xác nhận scope", "Đặt nhắc follow-up sau 24 giờ"]
        : ["Hỏi thêm phạm vi công việc", "Xác nhận ngân sách và timeline", "Cập nhật deal sau khi khách phản hồi"],
  };
}

export function AIPanel({ open, deal, onClose }: { open: boolean; deal?: Deal | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    if (!open || !deal) return;

    setLoading(true);
    setResult(null);

    const timer = window.setTimeout(() => {
      setResult(mockEvaluateDeal(deal));
      setLoading(false);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [deal, open]);

  const levelUi = useMemo(() => (result ? LEVEL_UI[result.level] : LEVEL_UI.warm), [result]);
  const ScoreIcon = levelUi.icon;

  if (!open || !deal) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">Đánh giá deal bằng AI</div>
              <div className="text-xs text-muted-foreground">Tự phân tích từ dữ liệu dự án hiện có</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:bg-secondary" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
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

          {loading && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">AI đang đánh giá deal...</div>
                  <div className="text-sm text-muted-foreground">Đang đọc dữ liệu khách hàng, ngân sách và mô tả nhu cầu.</div>
                </div>
              </div>
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
                  <div className="text-sm font-semibold">Tín hiệu phát hiện</div>
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

              <div className="rounded-xl border border-border bg-muted/30 p-4">
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
