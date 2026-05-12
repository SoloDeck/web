import { useEffect, useState } from "react";
import { Loader2, X, FileText, Download, Send } from "lucide-react";
import { formatVND, type Deal } from "@/lib/mock-data";

export function ProposalModal({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!deal) return;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, [deal]);

  if (!deal) return null;
  const today = new Date().toLocaleDateString("vi-VN");
  const deposit = Math.round(deal.value * 0.5);
  const final = deal.value - deposit;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Proposal AI · {deal.client}</div>
              <div className="text-xs text-muted-foreground">Bản nháp tự động bằng tiếng Việt</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="text-sm text-muted-foreground mt-3">AI đang soạn proposal...</div>
          </div>
        ) : (
          <div className="p-8 space-y-5 text-sm leading-relaxed">
            <div className="text-center border-b border-border pb-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Đề Xuất Dịch Vụ</div>
              <div className="text-2xl font-bold mt-1">{deal.projectType}</div>
              <div className="text-xs text-muted-foreground mt-1">Ngày: {today}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">BÊN CUNG CẤP</div>
                <div className="font-medium">Minh Nguyễn</div>
                <div className="text-xs text-muted-foreground">Brand & Content Designer · solodesk.vn</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">BÊN KHÁCH HÀNG</div>
                <div className="font-medium">{deal.client}</div>
                <div className="text-xs text-muted-foreground">{deal.contact}</div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-1">1. Phạm Vi Công Việc</div>
              <ul className="list-disc pl-5 space-y-0.5 text-foreground/80">
                <li>Khảo sát yêu cầu và brief chi tiết với khách hàng.</li>
                <li>Triển khai hạng mục: {deal.projectType.toLowerCase()}.</li>
                <li>2 vòng chỉnh sửa theo feedback (mỗi vòng tối đa 3 ngày làm việc).</li>
                <li>Bàn giao file gốc & file xuất bản theo định dạng yêu cầu.</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold mb-1">2. Tiến Độ Dự Kiến</div>
              <div className="text-foreground/80">Tổng thời gian: <b>3 tuần</b> kể từ ngày nhận cọc và brief đầy đủ.</div>
            </div>

            <div>
              <div className="font-semibold mb-1">3. Chi Phí & Thanh Toán</div>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="flex justify-between px-3 py-2 bg-muted">
                  <span>Tổng giá trị hợp đồng</span>
                  <span className="font-bold text-primary">{formatVND(deal.value)}</span>
                </div>
                <div className="flex justify-between px-3 py-2 border-t border-border">
                  <span>Đặt cọc (50%) khi ký</span>
                  <span className="font-medium">{formatVND(deposit)}</span>
                </div>
                <div className="flex justify-between px-3 py-2 border-t border-border">
                  <span>Thanh toán cuối khi bàn giao</span>
                  <span className="font-medium">{formatVND(final)}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                Hình thức: Chuyển khoản Vietcombank · Ví MoMo · Đã miễn phí xuất hoá đơn VAT.
              </div>
            </div>

            <div>
              <div className="font-semibold mb-1">4. Điều Khoản Khác</div>
              <p className="text-foreground/80">
                Mọi thay đổi ngoài scope sẽ được tính phí phát sinh theo thoả thuận. File bản quyền chính thức được chuyển giao sau khi hoàn tất thanh toán cuối kỳ.
              </p>
            </div>

            <div className="border-t border-border pt-4 text-xs text-muted-foreground italic">
              Trân trọng cảm ơn quý khách. Đề xuất có hiệu lực trong 7 ngày kể từ ngày gửi.
            </div>

            <div className="flex gap-2 pt-2">
              <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95">
                <Send className="h-4 w-4" /> Gửi cho khách qua Zalo OA
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-secondary/70">
                <Download className="h-4 w-4" /> Tải PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
