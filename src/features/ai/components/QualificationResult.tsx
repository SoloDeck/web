import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Flame,
  SearchX,
  } from "lucide-react";
import { useMemo, useState } from "react";

import type { LeadScore } from "@/features/deals/types";
import { cn } from "@/lib/utils";
import { LEVEL_UI } from "@/features/ai/qualificationUi";

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
  win: { score: number; level: string; factors: ScoreItem[] } | null;
  redFlags: string[];
  price: { low: number; high: number } | null;
};

/** Thứ tự hiển thị. `source` chỉ có ở thang khả năng chốt nên xếp cuối. */
const CRITERION_ORDER = ["scope", "budget", "timeline", "detail", "context", "source"] as const;

type MergedRow = {
  key: string;
  label: string;
  readiness: { points: number; max: number } | null;
  reason: string;
  evidence: string | null;
};

/**
 * Câu hiển thị khi KHÔNG tìm thấy dữ kiện cho tiêu chí đó.
 *
 * Phải nói rõ THIẾU CÁI GÌ, không phải một câu chung chung "không có dữ liệu". Người dùng
 * đọc xong phải biết ngay việc tiếp theo cần làm: hỏi khách về hạn bàn giao.  #Huynh
 */
const EMPTY_EVIDENCE: Record<string, string> = {
  scope: "Không tìm thấy mô tả phạm vi công việc — chưa rõ khách cần làm những hạng mục gì.",
  budget: "Không tìm thấy con số ngân sách nào khách đưa ra.",
  timeline: "Không tìm thấy mốc thời gian nào — chưa rõ khách cần bàn giao khi nào.",
  detail: "Khách chưa mô tả chi tiết yêu cầu.",
  context: "Không có thông tin về ngành nghề, quy mô hay hiện trạng của khách.",
  source: "Chưa rõ deal này đến từ đâu.",
};

/** Nhãn cho khối dữ kiện, nói đúng thứ người dùng đang tìm. */
const EVIDENCE_LABEL: Record<string, string> = {
  scope: "Khách cần làm gì",
  budget: "Ngân sách khách đưa ra",
  timeline: "Mốc thời gian khách nêu",
  detail: "Yêu cầu cụ thể ghi nhận được",
  context: "Bối cảnh khách hàng",
  source: "Deal đến từ đâu",
};

/**
 * Toàn bộ phần hiển thị kết quả chấm điểm — DÙNG CHUNG cho panel vừa chạy xong và cho
 * bản đã lưu trong tab Tài liệu.
 *
 * Trước đây hai nơi tự vẽ lấy, nên mở lại bản đã lưu là thấy giao diện CŨ: chỉ có điểm,
 * kết luận và mấy dòng tín hiệu — không có bảng phân rã, không có khả năng chốt, không
 * có cờ đỏ. Hai bản vẽ riêng thì kiểu gì cũng có ngày lệch nhau.  #Huynh
 */
export function QualificationResultView({ view }: { view: QualificationView }) {
  const levelUi = LEVEL_UI[view.level];
  const ScoreIcon = levelUi.icon;

  const mergedRows = useMemo<MergedRow[]>(() => {
    const readiness = new Map(view.breakdown.map((item) => [item.key ?? item.label, item]));

    return CRITERION_ORDER.map((key): MergedRow | null => {
      const r = readiness.get(key);
      if (!r) return null;

      return {
        key,
        label: r.label ?? key,
        readiness: { points: r.points, max: r.max_points },
        reason: r.reason?.trim() || "",
        evidence: r.evidence?.trim() || null,
      };
    }).filter((row): row is MergedRow => row !== null);
  }, [view]);

  return (
    <div className="space-y-4">
      {/* Một con số chủ đạo — mức độ sẵn sàng để báo giá.
          Trước đây có thêm thẻ "Khả năng chốt", nhưng nó suy đoán về khả năng thắng deal
          từ vài dữ kiện mỏng — người dùng thấy không giúp ích cho quyết định thực tế, nên
          đã bỏ. Giữ lại một con số RÕ RÀNG còn hơn hai con số làm loãng.  #Huynh */}
      <ScoreCard
        title="Sẵn sàng báo giá"
        hint="Yêu cầu của khách đã đủ rõ để bạn báo giá chưa"
        score={view.score}
        badge={view.label}
        badgeClass={levelUi.badgeClass}
        scoreClass={levelUi.scoreClass}
        Icon={ScoreIcon}
      />

      {/* Cờ đỏ ngay dưới điểm số — thứ có thể khiến freelancer mất tiền, để cuối trang
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
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Căn cứ chấm điểm</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Bấm vào từng dòng để xem dữ kiện thật — bạn không cần mở file ra đọc lại.
              </p>
            </div>
            <div className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Điểm
            </div>
          </div>

          <div className="mt-4 divide-y divide-border">
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
  );
}

/** Thẻ số lớn: vòng tiến độ SVG + điểm + nhãn mức. */
function ScoreCard({
  title,
  hint,
  score,
  badge,
  badgeClass,
  scoreClass,
  Icon,
}: {
  title: string;
  hint: string;
  score: number;
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
          <span className="font-semibold text-foreground">{score}</span> / 100 điểm
        </div>
      </div>
    </div>
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

/** Một dòng căn cứ: nhãn, hai cột điểm, thanh màu, và LÝ DO.
 *
 * Lý do là phần bắt buộc — điểm số không kèm lý do thì người dùng không kiểm chứng được,
 * mà không kiểm chứng được thì không đáng tin.
 */
function CriterionRow({ row }: { row: MergedRow }) {
  const [open, setOpen] = useState(false);

  const bar = row.readiness;
  const ratio = bar && bar.max > 0 ? bar.points / bar.max : 0;
  const tone = ratio >= 0.7 ? "positive" : ratio >= 0.4 ? "neutral" : "negative";
  const hasEvidence = Boolean(row.evidence);

  // Tách "Để lên tối đa: ..." ra dòng riêng, nhấn màu — người dùng thấy NGAY cần làm gì
  // để lên điểm, không lẫn trong câu giải thích vì sao.
  const improveIdx = row.reason.indexOf("Để lên tối đa");
  const whyText = improveIdx >= 0 ? row.reason.slice(0, improveIdx).trim() : row.reason;
  const improveText = improveIdx >= 0 ? row.reason.slice(improveIdx).trim() : "";

  return (
    <div className="first:pt-0 last:pb-0">
      {/* Cả dòng là một nút. Bấm đâu cũng mở — bắt người dùng nhắm vào đúng cái mũi tên
          nhỏ xíu bên phải là thiết kế hành hạ người ta. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full rounded-lg px-2 py-3 text-left transition-colors hover:bg-secondary/60"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5">
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90"
              )}
            />
            <span className="min-w-0 truncate text-sm font-medium">{row.label}</span>
            {/* Chấm màu báo trước là bên trong CÓ dữ kiện hay không, để người dùng không
                phải bấm mở từng dòng mới biết dòng nào rỗng. */}
            <span
              className={cn(
                "ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
                hasEvidence ? "bg-primary/70" : "bg-muted-foreground/25"
              )}
            />
          </span>
          <div className="flex shrink-0 items-baseline text-xs tabular-nums">
            <PointCell value={row.readiness} />
          </div>
        </div>

        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              tone === "positive"
                ? "bg-emerald-500"
                : tone === "negative"
                  ? "bg-rose-500"
                  : "bg-amber-500"
            )}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>

        {whyText && (
          <p className="mt-1.5 text-xs leading-4 text-muted-foreground">{whyText}</p>
        )}
        {improveText && (
          <p className="mt-1 flex items-start gap-1 text-xs font-medium leading-4 text-primary">
            <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{improveText}</span>
          </p>
        )}
      </button>

      {open && (
        <div className="mx-2 mb-3 rounded-lg border border-border bg-muted/40 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {EVIDENCE_LABEL[row.key] ?? "Dữ kiện ghi nhận được"}
          </div>

          {hasEvidence ? (
            <p className="mt-1 text-sm leading-5 text-foreground">{row.evidence}</p>
          ) : (
            <p className="mt-1 flex items-start gap-1.5 text-sm leading-5 text-muted-foreground">
              <SearchX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
              <span>{EMPTY_EVIDENCE[row.key] ?? "Không tìm thấy thông tin cho mục này."}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PointCell({ value }: { value: { points: number; max: number } | null }) {
  return (
    <span className="w-12 text-right font-semibold">
      {value ? (
        <>
          {value.points}
          <span className="text-muted-foreground opacity-70">/{value.max}</span>
        </>
      ) : (
        <span className="text-muted-foreground opacity-40">—</span>
      )}
    </span>
  );
}

