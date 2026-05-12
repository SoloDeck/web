import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Bell, Filter, Menu, Search, Sparkles } from "lucide-react";
import { AppSidebar } from "@/components/solodesk/Sidebar";
import { KanbanColumn } from "@/components/solodesk/KanbanColumn";
import { DealCard } from "@/components/solodesk/DealCard";
import { AIPanel } from "@/components/solodesk/AIPanel";
import { ProposalModal } from "@/components/solodesk/ProposalModal";
import { DealDetailModal } from "@/components/solodesk/DealDetailModal";
import { INITIAL_DEALS, STAGES, type Deal, type Stage } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [detail, setDetail] = useState<Deal | null>(null);
  const [proposal, setProposal] = useState<Deal | null>(null);
  const [query, setQuery] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtered = useMemo(
    () =>
      deals.filter(
        (d) =>
          d.client.toLowerCase().includes(query.toLowerCase()) ||
          d.projectType.toLowerCase().includes(query.toLowerCase())
      ),
    [deals, query]
  );

  const byStage = (stage: Stage) => filtered.filter((d) => d.stage === stage);
  const activeDeal = activeId ? deals.find((d) => d.id === activeId) ?? null : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeDealItem = deals.find((d) => d.id === active.id);
    if (!activeDealItem) return;
    const overId = String(over.id);
    const stageIds = STAGES.map((s) => s.id) as string[];

    // If dropped on a stage column (empty area), move to end of that stage
    if (stageIds.includes(overId)) {
      const targetStage = overId as Stage;
      if (targetStage === activeDealItem.stage) return;
      setDeals((prev) => {
        // remove active and append to end of target stage
        const without = prev.filter((p) => p.id !== active.id);
        const beforeTarget = without.filter((p) => p.stage !== targetStage);
        const targetItems = without.filter((p) => p.stage === targetStage);
        return [...beforeTarget, ...targetItems, { ...activeDealItem, stage: targetStage }];
      });
      return;
    }

    // Dropped on another deal card
    const overDeal = deals.find((d) => d.id === overId);
    if (!overDeal) return;

    // If same stage -> reorder within that stage
    if (overDeal.stage === activeDealItem.stage) {
      setDeals((prev) => {
        const stage = activeDealItem.stage;
        const stageItems = prev.filter((d) => d.stage === stage);
        const fromIndex = stageItems.findIndex((d) => d.id === active.id);
        const toIndex = stageItems.findIndex((d) => d.id === overDeal.id);
        if (fromIndex === -1 || toIndex === -1) return prev;
        const newStageItems = arrayMove(stageItems, fromIndex, toIndex);
        // rebuild full list preserving other stages order but replace this stage's order
        let si = 0;
        return prev.map((d) => (d.stage === stage ? newStageItems[si++] : d));
      });
      return;
    }

    // Moving to a different stage and placing at the overDeal's position
    setDeals((prev) => {
      const withoutActive = prev.filter((d) => d.id !== active.id);
      const targetStage = overDeal.stage;
      const targetItems = withoutActive.filter((d) => d.stage === targetStage);
      const insertIndex = targetItems.findIndex((d) => d.id === overDeal.id);
      const newTargetItems = [...targetItems];
      newTargetItems.splice(insertIndex, 0, { ...activeDealItem, stage: targetStage });

      // rebuild array replacing target stage items and removing active from original
      let ti = 0;
      return withoutActive.map((d) => (d.stage === targetStage ? newTargetItems[ti++] : d));
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar deals={deals} onOpenAI={() => setAiOpen(true)} />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-20">
          <div className="px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button className="lg:hidden p-2 rounded-md hover:bg-secondary">
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight truncate">Deal Pipeline</h1>
                <p className="text-xs text-muted-foreground truncate">
                  Quản lý {deals.length} cơ hội · Kéo thả để cập nhật trạng thái
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 w-72">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm khách hàng, dự án..."
                  className="bg-transparent text-sm flex-1 outline-none"
                />
              </div>
              <button className="p-2 rounded-md border border-border hover:bg-secondary">
                <Filter className="h-4 w-4" />
              </button>
              <button className="p-2 rounded-md border border-border hover:bg-secondary relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
              </button>
              <button
                onClick={() => setAiOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow"
              >
                <Sparkles className="h-4 w-4" /> AI Action
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="flex gap-4 p-4 lg:p-6 h-full min-w-max">
              {STAGES.map((s) => (
                <KanbanColumn
                  key={s.id}
                  stage={s.id}
                  title={s.title}
                  hint={s.hint}
                  deals={byStage(s.id)}
                  onCardClick={setDetail}
                  onDraft={setProposal}
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
        </div>
      </main>

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} />
      <ProposalModal deal={proposal} onClose={() => setProposal(null)} />
      <DealDetailModal deal={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
