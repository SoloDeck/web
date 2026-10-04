import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocTemplateChooser } from "@/features/deals/components/DocTemplateChooser";
import type { TermTemplateOption } from "@/services/proposalsService";

/**
 * Hộp thoại "Tạo hợp đồng": chọn mẫu làm nền, rồi chọn cách soạn (tự soạn hoặc nhờ AI).
 *
 * KHÔNG có nút "Hủy": dấu X ở góc hộp thoại (và phím Esc) đã đóng hộp rồi, nút thứ hai làm đúng
 * việc đó chỉ tốn một chỗ ở hàng nút. Hàng nút chỉ còn hai hành động thật sự đổi kết quả.  #Huynh
 */
export function ContractChooserDialog({
  open,
  onOpenChange,
  templates,
  templateId,
  onTemplateChange,
  canUseAi,
  onSelfCompose,
  onAi,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TermTemplateOption[];
  templateId: string | null;
  onTemplateChange: (templateId: string | null) => void;
  /** `false` = gói hiện tại không dùng được AI; `undefined` = chưa biết (đang tải). */
  canUseAi: boolean | undefined;
  onSelfCompose: () => void;
  onAi: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo hợp đồng</DialogTitle>
        </DialogHeader>
        <DocTemplateChooser
          templates={templates}
          value={templateId}
          onChange={onTemplateChange}
          docLabel="hợp đồng"
        />
        <DialogFooter>
          <button
            type="button"
            title="Không gọi AI, không tốn lượt — bạn tự điền nội dung trên tờ hợp đồng"
            onClick={onSelfCompose}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            Tôi tự soạn
          </button>
          <button
            type="button"
            disabled={canUseAi === false}
            title={
              canUseAi === false
                ? "Gói hiện tại chưa dùng được AI — bạn vẫn soạn tay được"
                : "AI viết nội dung hợp đồng dựa trên báo giá đã chốt"
            }
            onClick={onAi}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Nhờ AI viết
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
