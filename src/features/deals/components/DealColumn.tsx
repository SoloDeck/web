import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Deal, DealStatus } from '../hooks/useDealStore';
import { DealCard } from './DealCard';

interface DealColumnProps {
  id: DealStatus;
  title: string;
  deals: Deal[];
}

export const DealColumn: React.FC<DealColumnProps> = ({ id, title, deals }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div className="flex flex-col bg-slate-50 rounded-xl w-80 shrink-0">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
          {deals.length}
        </span>
      </div>
      
      <div 
        ref={setNodeRef} 
        className={`flex-1 p-3 min-h-[500px] transition-colors ${
          isOver ? 'bg-slate-100/80 ring-2 ring-blue-400/50 rounded-b-xl' : ''
        }`}
      >
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>
        {deals.length === 0 && (
          <div className="text-center text-sm text-slate-400 mt-6 border-2 border-dashed border-slate-200 rounded-lg p-4">
            Kéo thả Deal vào đây
          </div>
        )}
      </div>
    </div>
  );
};
