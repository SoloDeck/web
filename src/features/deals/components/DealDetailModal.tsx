import { X, Phone, MessageCircle, FileText, CreditCard, Clock, Construction } from "lucide-react";
import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";

const paymentColor = {
  "Chưa thanh toán": "bg-destructive/15 text-destructive",
  "Đã đặt cọc": "bg-warning/20 text-warning-foreground",
  "Đã thanh toán": "bg-success/15 text-success",
} as const;

function DevBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      <Construction className="h-2.5 w-2.5" /> Đang phát triển
    </span>
  );
}

export function DealDetailModal({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  if (!deal) return null;
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Chi tiết Dự án</div>
            <div className="font-semibold">{deal.client}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Stats row — all from API */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Giá trị dự kiến</div>
              <div className="font-bold text-primary">{formatVND(deal.value)}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Nguồn</div>
              <div className="font-semibold">{deal.channel}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Liên hệ</div>
              <div className="font-semibold text-sm truncate">{deal.contact || "—"}</div>
            </div>
          </div>

          {/* Project info — from API */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tên dự án</div>
            <div className="text-sm font-medium">{deal.projectType}</div>
            {deal.notes && <div className="text-xs text-muted-foreground mt-1">{deal.notes}</div>}
          </div>

          {/* Payment — status from API, method = Đang phát triển */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              <CreditCard className="h-3 w-3" /> Thanh toán
            </div>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className={`inline-flex text-xs font-semibold rounded-full px-2.5 py-0.5 ${paymentColor[deal.paymentStatus]}`}>
                  {deal.paymentStatus}
                </div>
                <DevBadge />
              </div>
              <div className="text-xs text-muted-foreground">
                Phương thức thanh toán và lịch sử giao dịch sẽ được đồng bộ sau.
              </div>
            </div>
          </div>

          {/* History — not in API yet */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              <Clock className="h-3 w-3" /> Lịch sử tương tác
              <DevBadge />
            </div>
            {deal.history.length > 0 ? (
              <ol className="space-y-2.5 border-l-2 border-border pl-4">
                {deal.history.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                    <div className="text-xs text-muted-foreground">{h.date}</div>
                    <div className="text-sm">{h.text}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3 text-center">
                Lịch sử tương tác sẽ được hiển thị khi tính năng được phát triển.
              </div>
            )}
          </div>

          {/* Documents — not in API yet */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              <FileText className="h-3 w-3" /> Tài liệu liên kết
              <DevBadge />
            </div>
            <div className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3 text-center">
              Đính kèm hợp đồng, báo giá sẽ được hỗ trợ trong phiên bản tiếp theo.
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-success text-success-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-95">
              <MessageCircle className="h-4 w-4" /> Nhắn Zalo
            </button>
            <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-secondary/70">
              <Phone className="h-4 w-4" /> Gọi điện
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
