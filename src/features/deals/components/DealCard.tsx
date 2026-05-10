import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Deal } from '../hooks/useDealStore';
import { formatCurrency } from '../../../utils/format';

interface DealCardProps {
  deal: Deal;
}

export const DealCard: React.FC<DealCardProps> = ({ deal }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { deal },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg border border-slate-200 shadow-sm p-4 cursor-grab active:cursor-grabbing mb-3 hover:border-slate-300 transition-colors ${
        isDragging ? 'opacity-50 border-blue-500 shadow-md ring-2 ring-blue-200' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-slate-800 text-sm">{deal.clientName}</h4>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getScoreColor(deal.aiScore)}`}>
          AI: {deal.aiScore}
        </span>
      </div>
      <div className="mt-2 text-slate-600 font-semibold">
        {formatCurrency(deal.value)}
      </div>
    </div>
  );
};
