import React from 'react';
import { 
  DndContext, 
  type DragOverEvent, 
  type DragEndEvent, 
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { DealColumn } from './components/DealColumn';
import { useDealStore, type DealStatus } from './hooks/useDealStore';

const COLUMNS: { id: DealStatus; title: string }[] = [
  { id: 'new_lead', title: 'Khách hàng mới' },
  { id: 'qualified', title: 'Tiềm năng' },
  { id: 'active', title: 'Đang xử lý' },
  { id: 'done', title: 'Hoàn thành' },
];

export const KanbanBoard: React.FC = () => {
  const { deals, setDeals } = useDealStore();
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isOverColumn = COLUMNS.some(col => col.id === overId);
    const activeDeal = deals.find(d => d.id === activeId);
    const overDeal = deals.find(d => d.id === overId);
    
    if (!activeDeal) return;

    const activeColumnId = activeDeal.status;
    const overColumnId = isOverColumn ? (overId as DealStatus) : overDeal?.status;

    if (!overColumnId || activeColumnId === overColumnId) {
      return;
    }

    setDeals((prevDeals) => {
      const activeIndex = prevDeals.findIndex(d => d.id === activeId);
      const overIndex = prevDeals.findIndex(d => d.id === overId);

      const newDeals = [...prevDeals];
      newDeals[activeIndex] = { ...newDeals[activeIndex], status: overColumnId };

      if (overIndex >= 0) {
        return arrayMove(newDeals, activeIndex, overIndex);
      }
      return newDeals;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId !== overId) {
      setDeals((prevDeals) => {
        const activeIndex = prevDeals.findIndex(d => d.id === activeId);
        const overIndex = prevDeals.findIndex(d => d.id === overId);
        if (activeIndex !== -1 && overIndex !== -1) {
          return arrayMove(prevDeals, activeIndex, overIndex);
        }
        return prevDeals;
      });
    }
  };

  return (
    <div className="p-6 h-full overflow-hidden flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Cơ hội (Deals)</h1>
          <p className="text-slate-500 text-sm mt-1">Kéo thả để thay đổi trạng thái quy trình làm việc và sắp xếp ưu tiên.</p>
        </div>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-slate-800 transition-colors">
          + Thêm Cơ hội mới
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 flex-1">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCorners} 
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {COLUMNS.map((col) => (
            <DealColumn 
              key={col.id} 
              id={col.id} 
              title={col.title} 
              deals={deals.filter(deal => deal.status === col.id)} 
            />
          ))}
        </DndContext>
      </div>
    </div>
  );
};

export default KanbanBoard;
