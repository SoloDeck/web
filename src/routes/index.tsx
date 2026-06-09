import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, Filter, Loader2, Menu, Search, Sparkles } from "lucide-react";
import { AppSidebar } from "@/components/layout/Sidebar";
import { KanbanBoard } from "@/features/deals/components/KanbanBoard";
import { AIPanel } from "@/features/ai/components/AIPanel";
import { ProposalModal } from "@/features/deals/components/ProposalModal";
import { DealDetailModal } from "@/features/deals/components/DealDetailModal";
import { ReminderCenter } from "@/features/reminders/components/ReminderCenter";
import { ProfileSettings } from "@/features/profile/components/ProfileSettings";
import { ClientRecords } from "@/features/clients/components/ClientRecords";
import { RevenueDashboard } from "@/features/revenue/components/RevenueDashboard";
import { useDeals } from "@/features/deals/hooks/useDeals";
import { useClauses, useProfile } from "@/features/profile/hooks/useProfile";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import type { Deal } from "@/features/deals/types";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: "/home", replace: true });
    }
  },
  component: Index,
});

type NavKey = "pipeline" | "clients" | "revenue" | "settings";

// eslint-disable-next-line react-refresh/only-export-components
function Index() {
  const { deals, isLoading } = useDeals();
  const { profile, setProfile } = useProfile();
  const { clauses, setClauses } = useClauses();

  const [aiOpen, setAiOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [detail, setDetail] = useState<Deal | null>(null);
  const [proposal, setProposal] = useState<Deal | null>(null);
  const [query, setQuery] = useState("");
  const [nav, setNav] = useState<NavKey>("pipeline");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const filtered = useMemo(
    () =>
      deals.filter(
        (d) =>
          d.client.toLowerCase().includes(query.toLowerCase()) ||
          d.projectType.toLowerCase().includes(query.toLowerCase())
      ),
    [deals, query]
  );

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
                <h1 className="text-lg font-bold tracking-tight truncate">
                  {nav === "pipeline" && "Đường Ống Cơ Hội"}
                  {nav === "clients" && "Hồ Sơ Khách Hàng"}
                  {nav === "revenue" && "Thanh Toán & Hợp Đồng"}
                  {nav === "settings" && "Cài Đặt Hồ Sơ"}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {nav === "pipeline" && `Quản lý ${deals.length} cơ hội · Kéo thả để cập nhật trạng thái`}
                  {nav === "clients" && "Quản lý thông tin khách hàng"}
                  {nav === "revenue" && "Bảng điều khiển tài chính"}
                  {nav === "settings" && "Cấu hình workspace của bạn"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {nav === "pipeline" && (
                <>
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
                </>
              )}
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
          {isLoading ? (
            <div className="h-full grid place-items-center text-muted-foreground">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
              </div>
            </div>
          ) : (
            <>
              {nav === "pipeline" && (
                <KanbanBoard deals={filtered} onCardClick={setDetail} onDraft={setProposal} />
              )}

              {nav === "clients" && (
                <ClientRecords
                  deals={deals}
                  onOpenDeal={(d) => {
                    setNav("pipeline");
                    setDetail(d);
                  }}
                />
              )}

              {nav === "revenue" && <RevenueDashboard deals={deals} />}

              {nav === "settings" && (
                <ProfileSettings
                  profile={profile}
                  onSave={setProfile}
                  clauses={clauses}
                  onSaveClauses={setClauses}
                />
              )}
            </>
          )}
        </div>
      </main>

      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} />
      <ProposalModal deal={proposal} onClose={() => setProposal(null)} />
      <DealDetailModal deal={detail} onClose={() => setDetail(null)} />
      <ReminderCenter open={reminderOpen} onClose={() => setReminderOpen(false)} deals={deals} />
    </div>
  );
}
