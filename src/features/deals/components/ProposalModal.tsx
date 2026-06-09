import { useEffect, useState } from "react";
import { Loader2, X, FileText, Download, Send, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List } from "lucide-react";
import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";

export function ProposalModal({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [proposalHtml, setProposalHtml] = useState("");

  const today = new Date().toLocaleDateString("vi-VN");

  useEffect(() => {
    if (!deal) return;
    setLoading(true);
    const deposit = Math.round(deal.value * 0.5);
    const final = deal.value - deposit;

    const t = setTimeout(() => {
      setProposalHtml(`
        <div style="text-align: center; border-bottom: 1px solid hsl(var(--border)); padding-bottom: 16px; margin-bottom: 20px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: hsl(var(--muted-foreground)); font-weight: 500;">ĐỀ XUẤT DỊCH VỤ</div>
          <div style="font-size: 24px; font-weight: bold; margin-top: 6px; color: hsl(var(--foreground)); line-height: 1.25;">${deal.projectType}</div>
          <div style="font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 6px;">Ngày lập: ${today}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 13px;">
          <div>
            <div style="font-size: 10px; font-weight: 600; color: hsl(var(--muted-foreground)); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">BÊN CUNG CẤP</div>
            <div style="font-weight: 600; font-size: 14px; color: hsl(var(--foreground));">Minh Nguyễn</div>
            <div style="color: hsl(var(--muted-foreground)); font-size: 12px; margin-top: 2px;">Thiết kế Thương hiệu & Nội dung · solodesk.space</div>
          </div>
          <div>
            <div style="font-size: 10px; font-weight: 600; color: hsl(var(--muted-foreground)); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">BÊN KHÁCH HÀNG</div>
            <div style="font-weight: 600; font-size: 14px; color: hsl(var(--foreground));">${deal.client}</div>
            <div style="color: hsl(var(--muted-foreground)); font-size: 12px; margin-top: 2px;">${deal.contact}</div>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: hsl(var(--foreground)); text-transform: uppercase; letter-spacing: 0.02em;">1. Phạm Vi Công Việc</div>
          <ul style="list-style-type: disc; padding-left: 20px; color: hsl(var(--foreground) / 0.85); margin: 0; line-height: 1.6;">
            <li style="margin-bottom: 4px;">Khảo sát yêu cầu và lập yêu cầu dự án chi tiết với khách hàng.</li>
            <li style="margin-bottom: 4px;">Triển khai hạng mục thiết kế/nội dung: ${deal.projectType.toLowerCase()}.</li>
            <li style="margin-bottom: 4px;">2 vòng chỉnh sửa theo ý kiến phản hồi (mỗi vòng tối đa 3 ngày làm việc).</li>
            <li style="margin-bottom: 4px;">Bàn giao file thiết kế gốc & tài liệu xuất bản theo định dạng yêu cầu.</li>
          </ul>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: hsl(var(--foreground)); text-transform: uppercase; letter-spacing: 0.02em;">2. Tiến Độ Dự Kiến</div>
          <div style="color: hsl(var(--foreground) / 0.85); line-height: 1.6;">Tổng thời gian triển khai: <strong>3 tuần</strong> kể từ ngày nhận tạm ứng và nhận đầy đủ thông tin yêu cầu.</div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: hsl(var(--foreground)); text-transform: uppercase; letter-spacing: 0.02em;">3. Chi Phí & Thanh Toán</div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid hsl(var(--border)); border-radius: 8px; overflow: hidden; margin-bottom: 8px; font-size: 13px;">
            <tr style="background-color: hsl(var(--muted)); border-bottom: 1px solid hsl(var(--border));">
              <td style="padding: 10px 14px; font-weight: 600; color: hsl(var(--foreground));">Tổng giá trị hợp đồng</td>
              <td style="padding: 10px 14px; font-weight: 700; text-align: right; color: hsl(var(--primary));">${formatVND(deal.value)}</td>
            </tr>
            <tr style="border-bottom: 1px solid hsl(var(--border));">
              <td style="padding: 10px 14px; color: hsl(var(--foreground));">Tạm ứng (50%) khi ký hợp đồng</td>
              <td style="padding: 10px 14px; font-weight: 500; text-align: right; color: hsl(var(--foreground));">${formatVND(deposit)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; color: hsl(var(--foreground));">Thanh toán nốt (50%) khi nghiệm thu bàn giao</td>
              <td style="padding: 10px 14px; font-weight: 500; text-align: right; color: hsl(var(--foreground));">${formatVND(final)}</td>
            </tr>
          </table>
          <div style="font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 4px;">
            Phương thức thanh toán: Chuyển khoản Vietcombank · Ví điện tử MoMo · Đã miễn phí xuất hoá đơn VAT.
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: hsl(var(--foreground)); text-transform: uppercase; letter-spacing: 0.02em;">4. Điều Khoản Khác</div>
          <p style="color: hsl(var(--foreground) / 0.85); margin: 0; line-height: 1.6;">Mọi thay đổi ngoài phạm vi thỏa thuận ban đầu sẽ được tính phí phát sinh theo sự thống nhất giữa hai bên. Bản quyền sản phẩm chính thức được chuyển giao sau khi hoàn tất thanh toán cuối kỳ.</p>
        </div>

        <div style="border-top: 1px solid hsl(var(--border)); padding-top: 16px; font-size: 12px; color: hsl(var(--muted-foreground)); font-style: italic; text-align: center; margin-top: 24px;">
          Trân trọng cảm ơn sự hợp tác của Quý khách. Đề xuất báo giá này có hiệu lực trong vòng 7 ngày kể từ ngày gửi.
        </div>
      `);
      setLoading(false);
    }, 900);

    return () => clearTimeout(t);
  }, [deal, today]);

  if (!deal) return null;

  const handleToolbarAction = (e: React.MouseEvent, command: string, value: string = "") => {
    e.preventDefault(); // Prevents losing focus from contentEditable
    document.execCommand(command, false, value);
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Modal Header */}
        <div className="bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <div className="font-semibold">Báo Giá AI · {deal.client}</div>
              <div className="text-xs text-muted-foreground">Bản nháp tự động bằng tiếng Việt (Hỗ trợ chỉnh sửa)</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center flex-1 flex flex-col justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground mt-3">AI đang soạn báo giá...</div>
          </div>
        ) : (
          <>
            {/* Rich Text Editor Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 bg-muted/40 border-b border-border shrink-0 flex-wrap">
              <button
                type="button"
                onMouseDown={(e) => handleToolbarAction(e, "bold")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="In đậm"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => handleToolbarAction(e, "italic")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="In nghiêng"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => handleToolbarAction(e, "underline")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Gạch chân"
              >
                <Underline className="h-4 w-4" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                type="button"
                onMouseDown={(e) => handleToolbarAction(e, "justifyLeft")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Căn lề trái"
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => handleToolbarAction(e, "justifyCenter")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Căn lề giữa"
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => handleToolbarAction(e, "justifyRight")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Căn lề phải"
              >
                <AlignRight className="h-4 w-4" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                type="button"
                onMouseDown={(e) => handleToolbarAction(e, "insertUnorderedList")}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Danh sách dấu chấm"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Editable Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-card text-foreground">
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setProposalHtml(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: proposalHtml }}
                className="outline-none focus:ring-1 focus:ring-ring/20 rounded-lg min-h-[350px] text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none border border-transparent focus:border-border/50 p-2"
              />
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border p-4 bg-card flex gap-2 shrink-0">
              <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 shadow-lg shadow-primary/20 transition">
                <Send className="h-4 w-4" /> Gửi cho khách qua Zalo OA
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-secondary/70 transition">
                <Download className="h-4 w-4" /> Tải PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
