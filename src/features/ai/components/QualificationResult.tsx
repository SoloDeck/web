import { AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2, Flame, Target } from "lucide-react";
import { useMemo } from "react";

import type { LeadScore } from "@/features/deals/types";
import { cn } from "@/lib/utils";
import { formatVND } from "@/utils/format";
import { LEVEL_UI, WIN_UI } from "@/features/ai/qualificationUi";

export type ScoreItem = {
  key?: string;
  label: string;
  points: number;
  max_points: number;
  reason?: string | null;
  impact?: "positive" | "neutral" | "negative" | null;
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
  win: { points: number; max: number; impact: ScoreItem["impact"] } | null;
  reason: string;
  winReason: string | null;
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
    const win = new Map((view.win?.factors ?? []).map((item) => [item.key ?? item.label, item]));

    return CRITERION_ORDER.map((key): MergedRow | null => {
      const r = readiness.get(key);
      const w = win.get(key);
      if (!r && !w) return null;

      const readinessReason = r?.reason?.trim() || "";
      const winReason = w?.reason?.trim() || "";

      return {
        key,
        label: r?.label ?? w?.label ?? key,
        readiness: r ? { points: r.points, max: r.max_points } : null,
        win: w ? { points: w.points, max: w.max_points, impact: w.impact ?? null } : null,
        reason: readinessReason || winReason,
        winReason: extraWinReason(key, r, winReason),
      };
    }).filter((row): row is MergedRow => row !== null);
  }, [view]);

  return (
    <div className="space-y-4">
      {/* Hai con số chủ đạo — nắm được tình hình trong 2 giây. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ScoreCard
          title="Sẵn sàng báo giá"
          hint="Yêu cầu của khách đã đủ rõ để bạn báo giá chưa"
          score={view.score}
          badge={view.label}
          badgeClass={levelUi.badgeClass}
          scoreClass={levelUi.scoreClass}
          Icon={ScoreIcon}
        />
        {view.win && (
          <ScoreCard
            title="Khả năng chốt"
            hint="Suy ra từ dữ kiện có thật trong deal"
            score={view.win.score}
            badge={WIN_UI[view.win.level]?.label ?? "Trung bình"}
            badgeClass={WIN_UI[view.win.level]?.badgeClass ?? WIN_UI.medium.badgeClass}
            scoreClass={WIN_UI[view.win.level]?.scoreClass ?? WIN_UI.medium.scoreClass}
            Icon={Target}
          />
        )}
      </div>

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
                Mọi điểm số đều nêu rõ lý do để bạn tự kiểm chứng.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Sẵn sàng</span>
              <span>Chốt</span>
            </div>
          </div>

          <div className="mt-4 divide-y divide-border">
            {mergedRows.map((row) => (
              <CriterionRow key={row.key} row={row} />
            ))}
          </div>

          {view.win && (
            <p className="mt-4 border-t border-border pt-3 text-[11px] leading-4 text-muted-foreground">
              Cột "Chốt" tính từ dữ kiện có thật (ngân sách so với giá thị trường, thời hạn, nguồn
              khách, độ chi tiết) — không phải AI phán đoán về con người khách hàng.
            </p>
          )}
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

      {view.price && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Giá thị trường AI ước lượng
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mức freelancer Việt nên tính cho khối lượng này — không phải ngân sách khách đưa.
            </p>
          </div>
          <div className="text-xl font-bold text-primary">
            {formatVND(view.price.low)} - {formatVND(view.price.high)}
          </div>
        </div>
      )}
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
  const bar = row.readiness ?? row.win;
  const ratio = bar && bar.max > 0 ? bar.points / bar.max : 0;
  const tone = row.win?.impact ?? (ratio >= 0.7 ? "positive" : ratio >= 0.4 ? "neutral" : "negative");

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium">{row.label}</span>
        <div className="flex shrink-0 items-baseline gap-4 text-xs tabular-nums">
          <PointCell value={row.readiness} />
          <PointCell value={row.win} />
        </div>
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tone === "positive" ? "bg-emerald-500" : tone === "negative" ? "bg-rose-500" : "bg-amber-500"
          )}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>

      {row.reason && <p className="mt-1.5 text-xs leading-4 text-muted-foreground">{row.reason}</p>}
      {row.winReason && (
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          <span className="font-medium text-foreground/70">Khả năng chốt:</span> {row.winReason}
        </p>
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

/**
 * Có nên hiện thêm dòng lý do thứ hai (của thang "khả năng chốt") không.
 *
 * Mặc định: KHÔNG — mỗi tiêu chí đúng một dòng lý do.
 *
 * Lý do: ba yếu tố `timeline`, `detail`, `budget` bên thang "khả năng chốt" được QUY ĐỔI
 * thẳng từ thang "sẵn sàng báo giá" — chúng không mang thông tin mới, chỉ diễn đạt lại
 * cùng một sự thật bằng câu khác. In cả hai thì người đọc thấy:
 *
 *     Không đề cập thời gian
 *     Khả năng chốt: Khách chưa nêu thời hạn — chưa rõ mức độ cần gấp.
 *
 * Hai câu, một ý. Thừa, và nhìn nghiệp dư.
 *
 * NGOẠI LỆ DUY NHẤT: `budget` khi khách CÓ nêu ngân sách. Lúc đó thang "chốt" mới thực
 * sự nói thêm điều mới — so ngân sách đó với giá thị trường ("thấp hơn nhiều — nguy cơ
 * không chốt được"). Đó là thông tin đáng đọc, không phải nhắc lại.
 *
 * Trước đây tôi lọc bằng cách SO CHUỖI hai câu xem có giống nhau không. Sai hướng: hai
 * câu khác chữ mà cùng nghĩa thì so chuỗi không bắt được. Chặn theo CẤU TRÚC dữ liệu
 * chắc chắn hơn nhiều.  #Huynh
 */
function extraWinReason(
  key: string,
  readiness: ScoreItem | undefined,
  winReason: string
): string | null {
  if (!winReason) return null;
  if (key !== "budget") return null;
  // Khách chưa nêu ngân sách → thang "chốt" chỉ nhắc lại "chưa nêu". Không có gì mới.
  if (!readiness || readiness.points <= 0) return null;
  return winReason;
}
