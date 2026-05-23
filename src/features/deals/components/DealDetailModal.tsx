import { X, Phone, MessageCircle, FileText, CreditCard, Clock } from "lucide-react";
import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";

const paymentColor = {
  "Chưa thanh toán": "bg-destructive/15 text-destructive",
  "Đã đặt cọc": "bg-warning/20 text-warning-foreground",
  "Đã thanh toán": "bg-success/15 text-success",
} as const;

export function DealDetailModal({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  if (!deal) return null;
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Chi tiết Cơ hội</div>
            <div className="font-semibold">{deal.client}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Giá trị</div>
              <div className="font-bold text-primary">{formatVND(deal.value)}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Kênh</div>
              <div className="font-semibold">{deal.channel}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Liên hệ</div>
              <div className="font-semibold text-sm">{deal.contact}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Dự án</div>
            <div className="text-sm">{deal.projectType}</div>
            <div className="text-xs text-muted-foreground mt-1">{deal.notes}</div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Thanh toán
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className={`inline-flex text-xs font-semibold rounded-full px-2.5 py-0.5 ${paymentColor[deal.paymentStatus]}`}>
                  {deal.paymentStatus}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Phương thức: {deal.paymentMethod}</div>
              </div>
              <div className="flex gap-1.5">
                <span className="text-[10px] rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 px-2 py-1 font-bold">MoMo</span>
                <span className="text-[10px] rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 font-bold">VCB</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Lịch sử tương tác
            </div>
            <ol className="space-y-2.5 border-l-2 border-border pl-4">
              {deal.history.map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                  <div className="text-xs text-muted-foreground">{h.date}</div>
                  <div className="text-sm">{h.text}</div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Tài liệu liên kết
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>Hợp đồng dịch vụ - v1.pdf</span>
                <button className="text-xs text-primary font-medium">Xem</button>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>Yêu cầu khách hàng.docx</span>
                <button className="text-xs text-primary font-medium">Xem</button>
              </div>
            </div>
          </div>

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
