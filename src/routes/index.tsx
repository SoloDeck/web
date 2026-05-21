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
import { ReminderCenter } from "@/components/solodesk/ReminderCenter";
import { ProfileSettings } from "@/components/solodesk/ProfileSettings";
import { ClientRecords } from "@/components/solodesk/ClientRecords";
import { RevenueDashboard } from "@/components/solodesk/RevenueDashboard";
import { useClauses, useProfile } from "@/lib/profile-store";
import { INITIAL_DEALS, STAGES, type Deal, type Stage } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [detail, setDetail] = useState<Deal | null>(null);
  const [proposal, setProposal] = useState<Deal | null>(null);
  const [query, setQuery] = useState("");
  const [nav, setNav] = useState<"pipeline" | "clients" | "revenue" | "settings">("pipeline");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { profile, setProfile } = useProfile();
  const { clauses, setClauses } = useClauses();

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
        const withoutActive = prev.filter((d) => d.id !== active.id);
        const targetItems = withoutActive.filter((d) => d.stage === targetStage);
        const newTargetItems = [...targetItems, { ...activeDealItem, stage: targetStage }];

        const firstIndex = withoutActive.findIndex((d) => d.stage === targetStage);
        if (firstIndex === -1) {
          return [...withoutActive, ...newTargetItems];
        }
        const before = withoutActive.slice(0, firstIndex);
        const after = withoutActive.slice(firstIndex).filter((d) => d.stage !== targetStage);
        return [...before, ...newTargetItems, ...after];
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

      const firstIndex = withoutActive.findIndex((d) => d.stage === targetStage);
      if (firstIndex === -1) {
        return [...withoutActive, ...newTargetItems];
      }
      const before = withoutActive.slice(0, firstIndex);
      const after = withoutActive.slice(firstIndex).filter((d) => d.stage !== targetStage);
      return [...before, ...newTargetItems, ...after];
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile sidebar overlay backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar 
        deals={deals} 
        onOpenAI={() => setAiOpen(true)} 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        active={nav}
        onNavigate={setNav}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-20">
          <div className="px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md hover:bg-secondary text-foreground"
                title={sidebarOpen ? "Đóng sidebar" : "Mở sidebar"}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight truncate">Đường Ống Cơ Hội</h1>
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
                onClick={() => setReminderOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary"
              >
                <Sparkles className="h-4 w-4 text-primary" /> Nhắc nhở
              </button>
              <button
                onClick={() => setAiOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow"
              >
                <Sparkles className="h-4 w-4" /> Tác vụ AI
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {nav === "pipeline" && (
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
          )}

          {nav === "clients" && (
            <div className="p-4 lg:p-6">
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Bảng khách hàng đang được mở dưới dạng cửa sổ modal từ sidebar. Chọn một khách hàng để xem chi tiết.
              </div>
            </div>
          )}

          {nav === "revenue" && (
            <div className="p-4 lg:p-6">
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Bảng thanh toán và hợp đồng đang được mở dưới dạng modal từ sidebar.
              </div>
            </div>
          )}

          {nav === "settings" && (
            <div className="p-4 lg:p-6">
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Cài đặt hồ sơ đang được mở từ sidebar.
              </div>
            </div>
          )}
        </div>
      </main>

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} />
      <ProposalModal deal={proposal} onClose={() => setProposal(null)} />
      <DealDetailModal deal={detail} onClose={() => setDetail(null)} />
      <ReminderCenter open={reminderOpen} onClose={() => setReminderOpen(false)} deals={deals} />
      <ProfileSettings
        open={nav === "settings"}
        onClose={() => setNav("pipeline")}
        profile={profile}
        onSave={setProfile}
        clauses={clauses}
        onSaveClauses={setClauses}
      />
      <ClientRecords
        open={nav === "clients"}
        onClose={() => setNav("pipeline")}
        deals={deals}
        onOpenDeal={(d) => {
          setNav("pipeline");
          setDetail(d);
        }}
      />
      <RevenueDashboard
        open={nav === "revenue"}
        onClose={() => setNav("pipeline")}
        deals={deals}
      />
    </div>
  );
}
