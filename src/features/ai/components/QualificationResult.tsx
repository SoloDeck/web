import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  MessageSquareQuote,
  PencilLine,
  SearchX,
  TrendingUp,
  } from "lucide-react";
import { useMemo, useState } from "react";

import type { LeadScore } from "@/features/deals/types";
import type { ScoreDelta } from "@/features/deals/hooks/useDealQualifications";
import type { QualificationGap, QualificationScoreGaps } from "@/services/dealsService";
import { cn } from "@/lib/utils";
import {
  CRITERION_ORDER,
  EMPTY_EVIDENCE,
  EVIDENCE_LABEL,
  LEVEL_UI,
} from "@/features/ai/qualificationUi";

export type ScoreItem = {
  key?: string;
  label: string;
  points: number;
  max_points: number;
  reason?: string | null;
  impact?: "positive" | "neutral" | "negative" | null;
  /**
   * DỮ KIỆN THẬT trích từ lời khách — "trước 30/09/2026", "120 triệu".
   *
   * Khác `reason`: `reason` là NHẬN XÉT của AI ("Khách nêu mốc cụ thể"), `evidence` là
   * THÔNG TIN khách đã nói. Freelancer đọc evidence để nắm được các mốc quan trọng mà
   * KHÔNG phải mở file PDF ra đọc lại.
   *
   * `null` = khách không hề nhắc tới. Giao diện phải NÓI THẲNG điều đó, không để trống —
   * ô trống thì người dùng không biết là "không có" hay là "hệ thống lỗi".  #Huynh
   */
  evidence?: string | null;
};

/**
 * Kết quả chấm điểm ở dạng đã sẵn sàng để hiển thị.
 *
 * Cố tình KHÔNG phải shape của API: bản lưu trong tab Tài liệu (localStorage) và bản
 * vừa chạy xong (từ backend) có shape khác nhau, nhưng phải hiện ra Y HỆT nhau.
 */
export type QualificationView = {
  level: LeadScore;
  score: number;
  label: string;
  rationale: string;
  recommendation: string;
  signals: string[];
  breakdown: ScoreItem[];
  /**
   * Vì sao MẤT phần điểm còn lại. `null` = bản ghi quá cũ, không có bảng phân rã để suy ra.
   *
   * Nội dung do backend tra từ bảng barem, KHÔNG phải chữ AI viết — nên nó luôn khớp với con
   * số điểm bên cạnh và không bao giờ trống vì AI trả thiếu.
   */
  gaps: QualificationScoreGaps | null;
  redFlags: string[];
};

type MergedRow = {
  key: string;
  label: string;
  readiness: { points: number; max: number } | null;
  reason: string;
  evidence: string | null;
  gap: QualificationGap | null;
  /** Một trong ba tiêu chí cộng lại bằng ngưỡng HOT. Thiếu là chắc chắn chưa thể HOT. */
  essential: boolean;
};

/**
 * Toàn bộ phần hiển thị kết quả chấm điểm — DÙNG CHUNG cho panel vừa chạy xong và cho
 * bản đã lưu trong tab Tài liệu.
 *
 * Trước đây hai nơi tự vẽ lấy, nên mở lại bản đã lưu là thấy giao diện CŨ: chỉ có điểm,
 * kết luận và mấy dòng tín hiệu — không có bảng phân rã, không có khả năng chốt, không
 * có cờ đỏ. Hai bản vẽ riêng thì kiểu gì cũng có ngày lệch nhau.  #Huynh
 */
export function QualificationResultView({
  view,
  delta,
  onFillGaps,
}: {
  view: QualificationView;
  /** So với lần chấm trước. `null` ở lần chấm đầu tiên, hoặc khi chưa chắc chắn. */
  delta?: ScoreDelta | null;
  /** Mở form bổ sung nhanh. Không truyền thì khối thiếu điểm chỉ có nút sao chép câu hỏi. */
  onFillGaps?: () => void;
}) {
  const levelUi = LEVEL_UI[view.level];
  const ScoreIcon = levelUi.icon;

  const mergedRows = useMemo<MergedRow[]>(() => {
    const readiness = new Map(view.breakdown.map((item) => [item.key ?? item.label, item]));
    const gapByKey = new Map((view.gaps?.gaps ?? []).map((gap) => [gap.key, gap]));
    const essential = new Set(view.gaps?.essential_missing ?? []);

    return CRITERION_ORDER.map((key): MergedRow | null => {
      const r = readiness.get(key);
      if (!r) return null;

      return {
        key,
        label: r.label ?? key,
        readiness: { points: r.points, max: r.max_points },
        reason: r.reason?.trim() || "",
        evidence: r.evidence?.trim() || null,
        gap: gapByKey.get(key) ?? null,
        essential: essential.has(key),
      };
    }).filter((row): row is MergedRow => row !== null);
  }, [view]);

  const gaps = view.gaps;

  return (
    /* HAI CỘT, cột trái DÍNH lại khi cuộn.
     *
     * Trước đây mọi thứ xếp dọc trong khung 768px: đọc "Thời gian mất 20 điểm" ở khối trên
     * rồi phải cuộn xuống khối "Căn cứ chấm điểm" để xem dữ kiện của CHÍNH tiêu chí đó —
     * mà lúc cuộn tới nơi thì con điểm tổng đã trôi khỏi màn hình.
     *
     * Giờ: điểm + phần thiếu + nút hành động nằm bên trái và ĐỨNG YÊN; chi tiết từng tiêu
     * chí cuộn bên phải.
     *
     * Dùng CONTAINER QUERY (`@container` + `@4xl:`) chứ KHÔNG dùng breakpoint màn hình.
     * Cùng component này được dựng trong hai khung rộng khác hẳn nhau: panel đánh giá
     * (1152px) và hộp xem lại bản đã lưu ở tab Lịch sử. Bám theo bề rộng MÀN HÌNH thì hộp
     * hẹp vẫn tưởng mình rộng nên vẫn chia hai cột, và chữ bị bóp còn một hai từ mỗi dòng.
     * Bám theo bề rộng CỦA CHÍNH NÓ thì đặt ở đâu cũng đúng.  #Huynh */
    <div className="@container">
    <div className="grid gap-5 @4xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] @4xl:items-start">
      <aside className="space-y-3 @4xl:sticky @4xl:top-20">
        <ScoreCard
          title="Sẵn sàng báo giá"
          hint="Yêu cầu của khách đã đủ rõ để bạn báo giá chưa"
          score={view.score}
          lostPoints={gaps?.lost_points ?? 0}
          badge={view.label}
          badgeClass={levelUi.badgeClass}
          scoreClass={levelUi.scoreClass}
          Icon={ScoreIcon}
        />

        {delta && <DeltaStrip score={view.score} delta={delta} />}

        {gaps && gaps.gaps.length > 0 && <GapSummary gaps={gaps} onFillGaps={onFillGaps} />}
      </aside>

      <div className="min-w-0 space-y-4">
        {/* Cờ đỏ lên đầu cột phải — thứ có thể khiến freelancer mất tiền, để cuối trang
            thì đọc tới nơi đã muộn. */}
        {view.redFlags.length > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Cờ đỏ cần lưu ý ({view.redFlags.length})
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {view.redFlags.map((flag) => (
                <li key={flag} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mergedRows.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm font-semibold">Bảng chấm điểm — {mergedRows.length} tiêu chí</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mỗi dòng nói cả hai vế: được điểm nhờ dữ kiện nào của khách, và mất điểm vì
              thiếu gì.
            </p>

            <div className="mt-4 space-y-3">
              {mergedRows.map((row) => (
                <CriterionRow key={row.key} row={row} />
              ))}
            </div>
          </div>
        )}

        <PanelCard title="Tín hiệu AI phát hiện" Icon={CheckCircle2}>
          <ul className="space-y-2">
            {view.signals.map((signal) => (
              <li key={signal} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </PanelCard>

        <PanelCard title="Kết luận" Icon={BadgeCheck}>
          <p className="text-sm leading-6 text-muted-foreground">{view.rationale}</p>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm font-medium text-primary">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{view.recommendation}</span>
          </div>
        </PanelCard>
      </div>
    </div>
    </div>
  );
}

/**
 * Dải "27 → 72  +45 so với lần chấm trước".
 *
 * Chứng minh vòng bổ sung–chấm lại có tác dụng thật: người dùng vừa điền ngân sách xong,
 * chấm lại thấy đúng dòng "Ngân sách +25" thì hiểu ngay cơ chế mà không cần giải thích.
 */
function DeltaStrip({ score, delta }: { score: number; delta: ScoreDelta }) {
  const diff = score - delta.previousScore;
  if (diff === 0 && delta.changes.length === 0) return null;

  const up = diff > 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-2.5 text-sm",
        up ? "border-success/30 bg-success/5" : "border-border bg-muted/40"
      )}
    >
      <span className="flex items-center gap-1.5 font-semibold tabular-nums">
        <span className="text-muted-foreground">{delta.previousScore}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{score}</span>
        {diff !== 0 && (
          <span className={cn("ml-1", up ? "text-success" : "text-destructive")}>
            {up ? "+" : ""}
            {diff}
          </span>
        )}
      </span>
      <span className="text-xs text-muted-foreground">so với lần chấm trước</span>
      {delta.changes.length > 0 && (
        <span className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {delta.changes.map((change) => (
            <span key={change.label} className="tabular-nums">
              {change.label}{" "}
              <span className={cn("font-semibold", change.diff > 0 ? "text-success" : "text-destructive")}>
                {change.diff > 0 ? "+" : ""}
                {change.diff}
              </span>
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/** Thẻ số lớn: vòng tiến độ SVG + điểm + nhãn mức. */
function ScoreCard({
  title,
  hint,
  score,
  lostPoints,
  badge,
  badgeClass,
  scoreClass,
  Icon,
}: {
  title: string;
  hint: string;
  score: number;
  lostPoints: number;
  badge: string;
  badgeClass: string;
  scoreClass: string;
  Icon: typeof Flame;
}) {
  // Một chỉ số thì không đáng kéo cả thư viện chart về. `currentColor` để vòng tròn ăn
  // theo màu chữ điểm — xanh/vàng/đỏ tự khớp với mức, không phải khai màu hai lần.
  const pct = Math.max(0, Math.min(100, score));
  const RADIUS = 32;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{hint}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
            badgeClass
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {badge}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className={cn("relative h-20 w-20 shrink-0", scoreClass)}>
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r={RADIUS} fill="none" strokeWidth="7" className="stroke-muted" />
            <circle
              cx="40"
              cy="40"
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - pct / 100)}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-2xl font-black leading-none">{score}</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">{score}</span> / 100 điểm
          </div>
          {/* Con số bị thiếu phải đứng NGANG HÀNG với con số đạt được. Chỉ hiện điểm đạt là
              kể nửa câu chuyện — người dùng đọc "27" mà không biết 27 đó xa 100 tới đâu. */}
          {lostPoints > 0 && (
            <div className="mt-0.5 text-xs">
              còn thiếu <span className="font-semibold text-foreground">{lostPoints}</span> điểm
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Tóm tắt phần thiếu ở cột trái: mất tổng bao nhiêu, mất ở đâu, và làm gì tiếp.
 *
 * CỐ Ý chỉ là bản tóm tắt. Chi tiết từng tiêu chí (đang ở nấc nào, lên nấc trên cần gì, nên
 * hỏi khách câu gì) nằm trong `CriterionRow` bên cột phải — CÙNG một dòng với dữ kiện đã ăn
 * điểm của chính tiêu chí đó.
 *
 * Bản trước tách hẳn thành khối "Vì sao chưa đạt 100 điểm" đặt trên bảng căn cứ, nên mỗi
 * tiêu chí hiện HAI LẦN ở hai chỗ cách nhau cả màn hình. Đúng cái bẫy `_factor()` trong
 * scoring.py đã cảnh báo khi bỏ thẻ "Khả năng chốt": hai bảng tách rời là kể một chuyện hai
 * lần, người dùng thấy "Thời gian 0/20" rồi lát sau lại "Thời gian 0/20".  #Huynh
 */
function GapSummary({
  gaps,
  onFillGaps,
}: {
  gaps: QualificationScoreGaps;
  onFillGaps?: () => void;
}) {
  const essential = new Set(gaps.essential_missing);
  const essentialCount = gaps.gaps.filter((gap) => essential.has(gap.key)).length;

  const headline = essentialCount
    ? `Thiếu ${essentialCount} mảng thiết yếu — chưa đủ căn cứ để báo giá chắc.`
    : "Đủ ba mảng thiết yếu để báo giá. Phần thiếu còn lại chỉ làm báo giá sắc hơn.";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-semibold">Còn thiếu</div>
        <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-destructive">
          {gaps.lost_points} điểm
        </span>
      </div>
      <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{headline}</p>

      {/* Sắp giảm dần theo điểm mất (backend đã sắp): hỏi một câu về ngân sách được 25 điểm,
          làm rõ bối cảnh chỉ được 10 — thứ tự đó phải nhìn thấy, đừng bắt người dùng tự so. */}
      <ul className="mt-3 space-y-1.5">
        {gaps.gaps.map((gap) => (
          <li key={gap.key} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-baseline gap-1">
              <span className="truncate">{gap.label}</span>
              {essential.has(gap.key) && (
                <span
                  className="shrink-0 text-warm"
                  title="Tiêu chí thiết yếu — còn thiếu thì chưa thể HOT"
                >
                  •
                </span>
              )}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-destructive">
              −{gap.lost_points}đ
            </span>
          </li>
        ))}
      </ul>

      {/* MỘT nút duy nhất. Bỏ "Sao chép cả bộ câu hỏi" vì mỗi câu hỏi đã có nút chép riêng
          ngay cạnh nó bên bảng chấm điểm — hai đường làm cùng một việc chỉ tổ phải chọn. */}
      {onFillGaps && (
        <button
          type="button"
          onClick={onFillGaps}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <PencilLine className="h-3.5 w-3.5" />
          Bổ sung thông tin
        </button>
      )}
    </div>
  );
}

/** "Khách nêu CON SỐ..." -> "khách nêu CON SỐ..." để ghép được sau chữ "nếu". */
function lowerFirst(text: string): string {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function CopyButton({
  text,
  label,
  copiedLabel,
  iconOnly = false,
  className,
}: {
  text: string;
  label: string;
  copiedLabel?: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  // `navigator.clipboard` không tồn tại trên http thường và trong jsdom — không chắn thì
  // bấm nút là nổ TypeError giữa màn kết quả.
  const canCopy = typeof navigator !== "undefined" && Boolean(navigator.clipboard);

  if (!canCopy) return null;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={className}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {!iconOnly && <span>{copied ? (copiedLabel ?? "Đã sao chép") : label}</span>}
    </button>
  );
}

function PanelCard({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: typeof Flame;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * Một tiêu chí — CẢ HAI VẾ trên cùng một dòng.
 *
 * Trái: được điểm nhờ dữ kiện nào của khách. Phải: mất điểm vì thiếu gì, và lên từng nấc
 * cần gì. Đây là điểm khác quan trọng nhất so với bản trước: hai vế của cùng một tiêu chí
 * từng nằm ở hai khối cách nhau cả màn hình, nên muốn đối chiếu là phải cuộn lên cuộn xuống.
 *
 * Cũng bỏ luôn kiểu gập/mở. Trước đây phải bấm từng dòng mới thấy dữ kiện — hợp lý khi khung
 * chỉ rộng 768px, nhưng giờ có hai cột thì giấu đi chỉ tổ bắt người dùng bấm 5 lần để đọc
 * đúng thứ họ mở màn hình này ra để đọc.  #Huynh
 */
function CriterionRow({ row }: { row: MergedRow }) {
  const bar = row.readiness;
  const ratio = bar && bar.max > 0 ? bar.points / bar.max : 0;
  const tone = ratio >= 0.7 ? "positive" : ratio >= 0.4 ? "neutral" : "negative";
  const hasEvidence = Boolean(row.evidence);
  const gap = row.gap;

  return (
    /* `@container` trên chính dòng này: hai vế "được điểm / mất điểm" bên dưới chia đôi theo
       bề rộng CỦA DÒNG, không theo màn hình. Nhờ vậy dòng nằm trong hộp hẹp thì tự xếp dọc
       thay vì bóp chữ thành một hai từ mỗi dòng. */
    <div className="@container rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{row.label}</span>
          {/* Thiết yếu = một trong ba tiêu chí cộng lại đúng bằng ngưỡng HOT. Còn thiếu cái
              nào ở đây thì deal không thể HOT, dù các tiêu chí kia có đầy điểm.

              Chữ để `text-foreground` chứ không phải `text-warm`: token --warm là oklch
              L=0.75, làm màu chữ trên nền sáng thì tương phản chỉ ~2.3:1, đọc không nổi.
              Màu ngữ nghĩa đẩy sang viền và nền. */}
          {row.essential && (
            <span className="shrink-0 rounded-full border border-warm bg-warm/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
              thiết yếu
            </span>
          )}
        </span>
        <span className="shrink-0 text-xs tabular-nums">
          <span className="font-semibold">
            {bar?.points ?? 0}
            <span className="font-normal text-muted-foreground">/{bar?.max ?? 0}</span>
          </span>
          {gap ? (
            <span className="ml-2 font-semibold text-destructive">−{gap.lost_points}đ</span>
          ) : (
            <span className="ml-2 font-semibold text-success">đủ điểm</span>
          )}
        </span>
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tone === "positive"
              ? "bg-success"
              : tone === "negative"
                ? "bg-destructive"
                : "bg-warm"
          )}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>

      <div className={cn("mt-3 grid gap-x-4 gap-y-3", gap && "@2xl:grid-cols-2")}>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Được điểm vì
          </div>
          {row.reason && (
            <p className="mt-1 text-sm leading-5 text-foreground/80">{row.reason}</p>
          )}
          {hasEvidence ? (
            <div className="mt-1.5 rounded-md border-l-2 border-primary/40 bg-primary/5 px-2.5 py-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {EVIDENCE_LABEL[row.key] ?? "Dữ kiện ghi nhận được"}
              </div>
              <p className="mt-0.5 text-sm leading-5 text-foreground">{row.evidence}</p>
            </div>
          ) : (
            <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-5 text-muted-foreground">
              <SearchX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
              <span>{EMPTY_EVIDENCE[row.key] ?? "Không tìm thấy thông tin cho mục này."}</span>
            </p>
          )}
        </div>

        {gap && (
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Mất điểm vì
            </div>
            <p className="mt-1 text-sm leading-5 text-foreground/80">{gap.current_state}</p>

            {/* THANG NẤC — thứ chứng minh điểm không tuỳ tiện. Nhìn là thấy tiêu chí này chỉ
                có vài giá trị hợp lệ, không có 22 hay 25 lẻ. Chỉ hiện các nấc TRÊN: nấc thấp
                hơn không giúp gì cho việc đi lên. */}
            <ul className="mt-1.5 space-y-1">
              {gap.steps.map((step) => (
                <li key={step.points} className="flex items-start gap-1.5 text-sm leading-5">
                  <TrendingUp className="mt-1 h-3 w-3 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="font-semibold text-primary">
                      Lên {step.points}đ (+{step.gain})
                    </span>{" "}
                    <span className="text-muted-foreground">
                      nếu {lowerFirst(step.requirement)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {gap?.ask && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-primary/5 p-2">
          <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm leading-5 text-foreground/90">{gap.ask}</p>
          <CopyButton
            text={gap.ask}
            label="Sao chép câu hỏi"
            iconOnly
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          />
        </div>
      )}
    </div>
  );
}

