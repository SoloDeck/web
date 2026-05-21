import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, Flame, Snowflake, Sun } from "lucide-react";
import { formatVND, type Deal } from "@/lib/mock-data";

const scoreCfg = {
  hot: { icon: Flame, label: "Nóng", cls: "bg-hot/15 text-hot border-hot/30" },
  warm: { icon: Sun, label: "Ấm", cls: "bg-warm/15 text-warm border-warm/30" },
  cold: { icon: Snowflake, label: "Lạnh", cls: "bg-cold/15 text-cold border-cold/30" },
} as const;

export function DealCard({
  deal,
  onClick,
  onDraft,
}: {
  deal: Deal;
  onClick: () => void;
  onDraft: (d: Deal) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { stage: deal.stage },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const Sc = scoreCfg[deal.score];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group cursor-grab active:cursor-grabbing rounded-lg bg-card border border-border p-3 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="text-sm font-semibold text-card-foreground line-clamp-1">
          {deal.client}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${Sc.cls}`}>
          <Sc.icon className="h-2.5 w-2.5" />
          {Sc.label}
        </span>
      </div>
      <div className="text-xs text-muted-foreground line-clamp-2 mb-2">{deal.projectType}</div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-primary">{formatVND(deal.value)}</div>
        <div className="text-[10px] text-muted-foreground">{deal.channel}</div>
      </div>

      {deal.stage === "qualified" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDraft(deal);
          }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-md bg-accent text-accent-foreground text-[11px] font-medium py-1.5 hover:bg-accent/80 transition"
        >
          <FileText className="h-3 w-3" /> Tạo Báo Giá AI
        </button>
      )}
    </div>
  );
}
