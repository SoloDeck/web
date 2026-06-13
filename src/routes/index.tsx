import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { Bell, Filter, Loader2, Menu, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/Sidebar";
import { KanbanBoard } from "@/features/deals/components/KanbanBoard";
import { NewDealModal } from "@/features/deals/components/NewDealModal";
import { ProposalModal } from "@/features/deals/components/ProposalModal";
import { DealDetailModal } from "@/features/deals/components/DealDetailModal";
import { ReminderCenter } from "@/features/reminders/components/ReminderCenter";
import { ProfileSettings } from "@/features/profile/components/ProfileSettings";
import { ClientRecords } from "@/features/clients/components/ClientRecords";
import { NewClientModal } from "@/features/clients/components/NewClientModal";
import { RevenueDashboard } from "@/features/revenue/components/RevenueDashboard";
import { useDeals } from "@/features/deals/hooks/useDeals";
import { useClauses, useProfile } from "@/features/profile/hooks/useProfile";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { updateMe } from "@/services/usersService";
import type { Deal } from "@/features/deals/types";
import type { Profile } from "@/features/profile/types";

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
  const updateUser = useAuthStore((s) => s.updateUser);

  const handleSaveProfile = useCallback(async (p: Profile) => {
    setProfile(p);
    try {
      await updateMe({ full_name: p.fullName, phone: p.phone || undefined });
      updateUser({ fullName: p.fullName });
    } catch {
      toast.error("Không thể lưu hồ sơ lên server. Thay đổi vẫn được lưu cục bộ.");
    }
  }, [setProfile, updateUser]);

  const [newDealOpen, setNewDealOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [clientsRefreshKey, setClientsRefreshKey] = useState(0);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [detail, setDetail] = useState<Deal | null>(null);
  const [proposal, setProposal] = useState<Deal | null>(null);
  const [query, setQuery] = useState("");
  const [nav, setNav] = useState<NavKey>("pipeline");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed top-0 left-72 right-0 bottom-0 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar
        deals={deals}
        onNewDeal={() => setNewDealOpen(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        active={nav}
        onNavigate={setNav}
      />

      <main className={`flex-1 flex flex-col min-w-0 transition-[margin-left] duration-300 ease-in-out ${sidebarOpen ? "ml-72" : "ml-0"}`}>
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
                  {nav === "pipeline" && "Quy Trình Dự Án"}
                  {nav === "clients" && "Hồ Sơ Khách Hàng"}
                  {nav === "revenue" && "Thanh Toán & Hợp Đồng"}
                  {nav === "settings" && "Cài Đặt Hồ Sơ"}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {nav === "pipeline" && `Quản lý ${deals.length} dự án · Kéo thả để cập nhật tiến độ`}
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
              {nav !== "clients" && (
                <button
                  onClick={() => setNewDealOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
                >
                  <Plus className="h-4 w-4" /> Thêm dự án mới
                </button>
              )}
              {nav === "clients" && (
                <button
                  onClick={() => setNewClientOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
                >
                  <Plus className="h-4 w-4" /> Khách hàng mới
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
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
                  key={clientsRefreshKey}
                  onOpenDeal={(d) => {
                    setNav("pipeline");
                    setDetail(d);
                  }}
                />
              )}

              {nav === "revenue" && <RevenueDashboard />}

              {nav === "settings" && (
                <ProfileSettings
                  profile={profile}
                  onSave={handleSaveProfile}
                  clauses={clauses}
                  onSaveClauses={setClauses}
                />
              )}
            </>
          )}
        </div>
      </main>

      <NewDealModal open={newDealOpen} onClose={() => setNewDealOpen(false)} />
      <NewClientModal
        open={newClientOpen}
        onClose={() => setNewClientOpen(false)}
        onCreated={() => setClientsRefreshKey((k) => k + 1)}
      />
      <ProposalModal deal={proposal} onClose={() => setProposal(null)} />
      <DealDetailModal deal={detail} onClose={() => setDetail(null)} />
      <ReminderCenter open={reminderOpen} onClose={() => setReminderOpen(false)} deals={deals} />
    </div>
  );
}
