/**
 * DealDetailModal.tsx
 *
 * Sheet chi tiết dự án trượt từ phải — mở khi click card trên Kanban.
 * Dùng DealDetailBody để hiển thị đầy đủ: tiến trình, thông tin, khách hàng,
 * lịch sử liên hệ, tài liệu.
 */

import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { DealDetailBody } from "./DealDetailBody";
import { STAGES, type Deal } from "../types";

const STAGE_COLOR: Record<string, string> = {
  new_lead: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  qualified: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  proposal_sent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  in_negotiation: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  completed_and_billed: "bg-green-500/10 text-green-600 dark:text-green-400",
  lost: "bg-destructive/10 text-destructive",
};

const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.title]));

import { formatVND } from "@/utils/format";

export function DealDetailModal({
  deal,
  onClose,
}: {
  deal: Deal | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!deal} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-1/4 sm:min-w-[500px] p-0 flex flex-col overflow-hidden"
      >
        {/* Accessibility title — ẩn */}
        <SheetHeader className="sr-only">
          <SheetTitle>Chi tiết dự án</SheetTitle>
        </SheetHeader>

        {deal && (
          <>
            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="px-5 pt-5 pb-4 border-b border-border bg-card shrink-0">
              <div className="pr-8"> {/* chừa chỗ cho nút X của Sheet */}
                <p className="text-xs text-muted-foreground mb-0.5">Chi tiết dự án</p>
                <h2 className="text-base font-bold leading-snug">{deal.projectType}</h2>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{deal.client}</p>
              </div>

              {/* Stage + value */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={`inline-flex text-[10px] font-semibold rounded-full px-2.5 py-0.5 ${STAGE_COLOR[deal.stage] ?? "bg-muted text-muted-foreground"}`}>
                  {STAGE_LABEL[deal.stage] ?? deal.stage}
                </span>
                <span className="text-sm font-bold text-primary">{formatVND(deal.value)}</span>
              </div>
            </div>

            {/* ── Body (shared component) ───────────────────────────────── */}
            <DealDetailBody deal={deal} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
