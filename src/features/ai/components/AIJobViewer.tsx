import { AIPanel } from "@/features/ai/components/AIPanel";
import { useAIActivityStore } from "@/features/ai/hooks/useAIActivityStore";
import { ProposalModal } from "@/features/deals/components/ProposalModal";
import { useDeal } from "@/features/deals/hooks/useDeals";

/**
 * Nơi DUY NHẤT mount các panel AI, đặt ở tầng gốc nên bấm "Xem" ở màn hình nào cũng mở
 * được — kể cả bảng Kanban.
 *
 * Trước đây AIPanel và ProposalModal nằm ngay trong trang chi tiết deal, dẫn tới hai lỗi:
 *
 * 1. Đứng ở bảng Kanban bấm "Xem" trên thẻ job → không có gì xảy ra, vì panel của deal
 *    đó còn chưa được dựng.
 * 2. Trang chi tiết mở panel theo `viewRequestId` mà KHÔNG xét loại job, nên bấm
 *    "Tạo Báo Giá AI" lại bật ra cửa sổ "Đánh giá deal bằng AI" — sai hẳn panel.
 *
 * Giờ store giữ đúng một "khay" panel (kind + dealId), component này đọc và mount đúng
 * panel tương ứng.  #Huynh
 */
export function AIJobViewer() {
  const panel = useAIActivityStore((state) => state.panel);
  const closePanel = useAIActivityStore((state) => state.closePanel);

  // Panel cần cả object Deal (tên khách, ngân sách...), mà store chỉ giữ id — nên tải
  // theo id. Ở trang chi tiết thì deal đã có sẵn trong cache của TanStack Query nên
  // không phát sinh request thừa.
  const { data: deal } = useDeal(panel?.dealId);

  if (!panel || !deal) return null;

  // `openNonce` đổi mỗi lần người dùng bấm mở/Xem. Panel dùng nó để biết đây là một lần
  // mở MỚI mà bung ra — nếu không, thu nhỏ xong bấm "Xem" lại sẽ không lên, vì cờ thu
  // nhỏ bên trong panel vẫn còn nguyên.
  //
  // Phân biệt rõ hai thao tác:
  //   - Thu nhỏ (bấm ra ngoài / nút Thu nhỏ): panel Ở LẠI store → mở lại được bất cứ lúc
  //     nào từ Task Center. Người dùng có khi chỉ muốn ẩn một lát rồi xem kỹ hơn.
  //   - Đóng (nút X / Huỷ): gọi closePanel() → bỏ hẳn khỏi store.
  if (panel.kind === "deal_qualification") {
    return (
      <AIPanel
        open
        deal={deal}
        viewJobId={panel.jobId ?? null}
        openNonce={panel.openedAt}
        onClose={closePanel}
      />
    );
  }

  if (panel.kind === "proposal_generation") {
    return (
      <ProposalModal
        deal={deal}
        existingProposalId={panel.proposalId ?? null}
        openNonce={panel.openedAt}
        onClose={closePanel}
      />
    );
  }

  return null;
}
