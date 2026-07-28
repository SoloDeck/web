import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { KanbanColumn } from "./KanbanColumn";
import { DealCard } from "./DealCard";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import {
  useMarkNotificationRead,
  useUnseenDealNotifications,
} from "@/features/notifications/hooks/useNotifications";
import { STAGES, STAGE_BY_ID, VALID_TRANSITIONS, type Deal, type Stage } from "@/features/deals/types";
import { updateDealStage } from "@/services/dealsService";

// Kanban chỉ hiển thị các bước freelancer đang xử lý; stage lost vẫn giữ trong type/API nhưng ẩn khỏi UI.
const VISIBLE_STAGES = STAGES.filter((stage) => stage.id !== "lost");
const STAGE_IDS = VISIBLE_STAGES.map((stage) => stage.id) as string[];

export function KanbanBoard({
  deals,
  onCardClick,
  onDraft,
  onAddDeal,
}: {
  deals: Deal[];
  onCardClick: (d: Deal) => void;
  onDraft: (d: Deal) => void;
  onAddDeal?: () => void;
}) {
  const handleDragEnd = useDealStore((s) => s.handleDragEnd);
  const moveToStage = useDealStore((s) => s.moveToStage);
  const recentlyMovedId = useDealStore((s) => s.recentlyMovedId);
  const clearRecentlyMoved = useDealStore((s) => s.clearRecentlyMoved);
  // Deal khách vừa gửi qua biểu mẫu mà freelancer chưa xem — thứ phải nhìn thấy TRƯỚC TIÊN
  // khi mở web lên. Trước đây chúng nằm lẫn giữa các thẻ cũ trong cột "Deal Mới".  #Huynh
  const unseenDeals = useUnseenDealNotifications();
  const markRead = useMarkNotificationRead();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);

  // KHÔNG hẹn giờ tắt highlight nữa.
  //
  // Bản trước tắt sau 2,5 giây. Nhưng phần lớn thao tác đổi giai đoạn KHÔNG diễn ra trên
  // bảng này: bấm "Lưu & chuyển sang Đã đánh giá" là đang đứng ở trang chi tiết deal, lúc
  // quay ra bảng thì hiệu ứng đã tắt từ lâu — pháo hoa bắn vào chỗ không có ai xem.
  //
  // Giờ cờ sống tới khi người dùng THẬT SỰ nhìn thấy: bấm vào thẻ là tắt (xem `openDeal`
  // bên dưới). Không sợ dính dai — `moveToStage` ghi đè `recentlyMovedId` nên chỉ có đúng
  // một thẻ sáng, và cờ nằm trong store bộ nhớ nên F5 là sạch.  #Huynh
  const openDeal = (deal: Deal) => {
    clearRecentlyMoved();
    // Mở deal ra xem = đã xem. Đánh dấu thông báo "khách vừa gửi yêu cầu" là đã đọc để
    // thẻ hết sáng và chuông giảm một — cùng lối với `clearRecentlyMoved` ngay trên.
    const notificationId = unseenDeals.get(deal.id);
    if (notificationId) markRead.mutate(notificationId);
    onCardClick(deal);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Deal CHƯA XEM lên đầu cột. Giữ nguyên thứ tự tương đối của phần còn lại (server đã sắp
  // theo lần cập nhật gần nhất) — chỉ nhấc nhóm chưa xem lên trước.
  const byStage = (stage: Stage) => {
    const items = deals.filter((deal) => deal.stage === stage);
    if (unseenDeals.size === 0) return items;
    const unseen = items.filter((deal) => unseenDeals.has(deal.id));
    if (unseen.length === 0) return items;
    return [...unseen, ...items.filter((deal) => !unseenDeals.has(deal.id))];
  };
  const activeDeal = activeId ? deals.find((deal) => deal.id === activeId) ?? null : null;

  function resolveOverStage(overId: string | null): Stage | null {
    if (!overId) return null;
    if (STAGE_IDS.includes(overId)) return overId as Stage;
    return deals.find((deal) => deal.id === overId)?.stage ?? null;
  }

  const onDragOver = (event: DragOverEvent) => {
    // Khi hover lên card con, vẫn suy ra stage của card để làm sáng cả cột nhận drop.
    setOverStage(resolveOverStage(event.over ? String(event.over.id) : null));
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const draggedId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    setActiveId(null);
    setOverStage(null);

    if (!overId) return;

    const draggedDeal = deals.find((deal) => deal.id === draggedId);
    if (!draggedDeal) return;
    const oldStage = draggedDeal.stage;

    let newStage: Stage | undefined;
    if (STAGE_IDS.includes(overId)) {
      newStage = overId as Stage;
    } else {
      newStage = deals.find((deal) => deal.id === overId)?.stage;
    }

    if (!newStage || newStage === oldStage) {
      handleDragEnd(draggedId, overId);
      return;
    }

    const allowed = VALID_TRANSITIONS[oldStage] ?? [];
    if (!allowed.includes(newStage)) {
      toast.error(
        `Không thể chuyển từ "${STAGE_BY_ID[oldStage].title}" sang "${STAGE_BY_ID[newStage].title}". Vui lòng đi từng bước.`
      );
      return;
    }

    handleDragEnd(draggedId, overId);

    try {
      await updateDealStage(draggedId, newStage);
      toast.success(`Đã chuyển sang ${STAGE_BY_ID[newStage].title}.`);
    } catch {
      moveToStage(draggedId, oldStage);
      toast.error("Không thể cập nhật trạng thái dự án. Đã hoàn tác.");
    }
  };

  const onDragCancel = () => {
    setActiveId(null);
    setOverStage(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event: DragStartEvent) => {
        setActiveId(String(event.active.id));
        setOverStage(null);
      }}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="grid h-full min-w-0 grid-cols-6 grid-rows-1 gap-3 p-4 lg:gap-4 lg:p-6">
        {VISIBLE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage.id}
            title={stage.title}
            hint={stage.hint}
            deals={byStage(stage.id)}
            onCardClick={openDeal}
            onDraft={onDraft}
            onAddDeal={onAddDeal}
            isDropTarget={overStage === stage.id}
            highlightedDealId={recentlyMovedId}
            unseenDealIds={unseenDeals}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal && (
          <div className="rotate-3">
            <DealCard deal={activeDeal} onClick={() => {}} onDraft={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
