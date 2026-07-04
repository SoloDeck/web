import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Columns3,
  Filter,
  List,
  Loader2,
  Menu,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/Sidebar";
import { KanbanBoard } from "@/features/deals/components/KanbanBoard";
import { NewDealModal } from "@/features/deals/components/NewDealModal";
import { ProposalModal } from "@/features/deals/components/ProposalModal";
import { AIPanel } from "@/features/ai/components/AIPanel";
import { AIActivityCenter } from "@/features/ai/components/AIActivityCenter";
import { ReminderCenter } from "@/features/reminders/components/ReminderCenter";
import { ProfileSettings } from "@/features/profile/components/ProfileSettings";
import { ClientRecords } from "@/features/clients/components/ClientRecords";
import { RevenueDashboard } from "@/features/revenue/components/RevenueDashboard";
import { IntakeFormConfig } from "@/features/intake/components/IntakeFormConfig";
import { SubscriptionPage } from "@/features/subscriptions/components/SubscriptionPage";
import { useDeals } from "@/features/deals/hooks/useDeals";
import { useClauses, useProfile } from "@/features/profile/hooks/useProfile";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { updateMe, updateFreelancerProfile } from "@/services/usersService";
import { STAGE_BY_ID, type Deal } from "@/features/deals/types";
import { formatVND } from "@/utils/format";
import type { Profile } from "@/features/profile/types";
import type { ClientRecord } from "@/services/clientsService";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/home", replace: true });
    }
    if (user?.role === "admin") {
      throw redirect({ to: "/admin", replace: true });
    }
  },
  component: Index,
});

type NavKey = "pipeline" | "clients" | "revenue" | "intake-form" | "settings" | "subscription";
type PipelineView = "kanban" | "list";

const PAGE_META: Record<NavKey, { title: string; description: string }> = {
  pipeline: {
    title: "Quy trình deal",
    description: "Theo dõi yêu cầu khách hàng từ tư vấn, báo giá đến triển khai.",
  },
  clients: {
    title: "Hồ sơ khách hàng",
    description: "Quản lý thông tin liên hệ và lịch sử làm việc.",
  },
  revenue: {
    title: "Thanh toán & Hợp đồng",
    description: "Theo dõi báo giá, hợp đồng và dòng tiền.",
  },
  "intake-form": {
    title: "Biểu mẫu tiếp nhận",
    description: "Cấu hình form public để khách gửi yêu cầu dự án.",
  },
  settings: {
    title: "Cài đặt hồ sơ",
    description: "Cập nhật thông tin freelancer và mẫu điều khoản.",
  },
  subscription: {
    title: "Gói đăng ký",
    description: "Xem và quản lý gói dịch vụ SoloDesk của bạn.",
  },
};

// eslint-disable-next-line react-refresh/only-export-components
function Index() {
  const navigate = useNavigate();
  const { deals, isLoading } = useDeals();
  const { profile, setProfile } = useProfile();
  const { clauses, setClauses } = useClauses();
  const currentUser = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const handleSaveProfile = useCallback(async (p: Profile) => {
    setProfile(p);
    try {
      await Promise.all([
        updateMe({ full_name: p.fullName, phone: p.phone || undefined }),
        updateFreelancerProfile({
          professional_title: p.professionalTitle || undefined,
          bio: p.bio || undefined,
          skills: p.skills.length > 0 ? p.skills : undefined,
          service_categories: p.serviceCategories.length > 0 ? p.serviceCategories : undefined,
          avatar_url: p.avatarUrl || undefined,
          portfolio_url: p.portfolioUrl || undefined,
          is_listed: p.isListed,
        }),
      ]);
      updateUser({ fullName: p.fullName });
    } catch {
      toast.error("Không thể lưu hồ sơ lên server. Thay đổi vẫn được lưu cục bộ.");
    }
  }, [setProfile, updateUser]);

  const [newDealOpen, setNewDealOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [proposal, setProposal] = useState<Deal | null>(null);
  const [aiDeal, setAiDeal] = useState<Deal | null>(null);
  const [query, setQuery] = useState("");
  const [nav, setNav] = useState<NavKey>("pipeline");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pipelineView, setPipelineView] = useState<PipelineView>("kanban");
  const pageMeta = PAGE_META[nav];

  useEffect(() => {
    // Nếu role admin được hydrate sau khi route đã load, vẫn đẩy về console quản trị.
    if (currentUser?.role === "admin") {
      navigate({ to: "/admin", replace: true });
    }
  }, [currentUser?.role, navigate]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return deals;
    return deals.filter(
      (deal) =>
        deal.client.toLowerCase().includes(term) ||
        deal.projectType.toLowerCase().includes(term)
    );
  }, [deals, query]);

  const totalValue = useMemo(
    () => filtered.reduce((sum, deal) => sum + deal.value, 0),
    [filtered]
  );

  const handleAiAction = useCallback((deal: Deal) => {
    if (deal.stage === "new_lead") {
      setAiDeal(deal);
      return;
    }
    if (deal.stage === "in_negotiation") {
      navigate({ to: "/deals/$dealId", params: { dealId: deal.id } });
      return;
    }
    setProposal(deal);
  }, [navigate]);

  const openDeal = useCallback(
    (deal: Deal) => {
      navigate({ to: "/deals/$dealId", params: { dealId: deal.id } });
    },
    [navigate]
  );

  const openClient = useCallback(
    (client: ClientRecord) => {
      navigate({ to: "/clients/$clientId", params: { clientId: client.id } });
    },
    [navigate]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar
        onOpenAI={() => setNewDealOpen(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        active={nav}
        onNavigate={(nextNav) => {
          if (nextNav === "admin") {
            navigate({ to: "/admin" });
            return;
          }
          setNav(nextNav);
          if (window.innerWidth < 1024) setSidebarOpen(false);
        }}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-2 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="rounded-md p-2 text-foreground hover:bg-secondary"
                title={sidebarOpen ? "Đóng menu" : "Mở menu"}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-5 text-foreground sm:text-base">
                  {pageMeta.title}
                </h1>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  {pageMeta.description}
                </p>
              </div>
              {nav === "pipeline" && (
                <div className="hidden items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 md:flex md:w-72 lg:ml-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm khách hàng, yêu cầu..."
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {nav === "pipeline" && (
                <button className="rounded-md border border-border p-2 hover:bg-secondary" title="Bộ lọc">
                  <Filter className="h-4 w-4" />
                </button>
              )}
              <button className="relative rounded-md border border-border p-2 hover:bg-secondary" title="Thông báo">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
              </button>
              <button
                onClick={() => setReminderOpen(true)}
                className="hidden items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-secondary sm:inline-flex"
              >
                <Sparkles className="h-4 w-4 text-primary" /> Nhắc nhở
              </button>
              <button
                onClick={() => setNewDealOpen(true)}
                className="hidden items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 sm:inline-flex"
              >
                <Plus className="h-4 w-4" /> Thêm yêu cầu mới
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {nav === "intake-form" ? (
            <IntakeFormConfig />
          ) : isLoading ? (
            <div className="grid h-full place-items-center text-muted-foreground">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu...
              </div>
            </div>
          ) : (
            <>
              {nav === "pipeline" && (
                <section className="flex h-full flex-col overflow-hidden">
                  <div className="border-b border-border bg-background px-4 py-4 lg:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h1 className="text-xl font-bold tracking-tight">Quy Trình Dự Án</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {filtered.length} deal · Tổng: {formatVND(totalValue)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex rounded-lg border border-border bg-card p-1">
                          <button
                            type="button"
                            onClick={() => setPipelineView("kanban")}
                            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                              pipelineView === "kanban"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Columns3 className="h-4 w-4" /> Bảng
                          </button>
                          <button
                            type="button"
                            onClick={() => setPipelineView("list")}
                            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                              pipelineView === "list"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <List className="h-4 w-4" /> Danh sách
                          </button>
                        </div>
                        <button
                          onClick={() => setNewDealOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 sm:hidden"
                        >
                          <Plus className="h-4 w-4" /> Thêm
                        </button>
                      </div>
                    </div>
                  </div>

                  {pipelineView === "kanban" ? (
                    <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
                      <KanbanBoard
                        deals={filtered}
                        onCardClick={openDeal}
                        onDraft={handleAiAction}
                        onAddDeal={() => setNewDealOpen(true)}
                      />
                    </div>
                  ) : (
                    <PipelineList deals={filtered} onOpenDeal={openDeal} />
                  )}
                </section>
              )}

              {nav === "clients" && (
                <ClientRecords onOpenClient={openClient} />
              )}

              {nav === "revenue" && <RevenueDashboard />}

              {nav === "subscription" && <SubscriptionPage />}

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
      <ProposalModal deal={proposal} onClose={() => setProposal(null)} />
      <AIPanel open={Boolean(aiDeal)} deal={aiDeal} onClose={() => setAiDeal(null)} />
      <AIActivityCenter />
      <ReminderCenter open={reminderOpen} onClose={() => setReminderOpen(false)} deals={deals} />
    </div>
  );
}

function PipelineList({ deals, onOpenDeal }: { deals: Deal[]; onOpenDeal: (deal: Deal) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[1.4fr_1fr_140px_150px] border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <div>Yêu cầu / deal</div>
          <div>Khách hàng</div>
          <div>Giai đoạn</div>
          <div className="text-right">Giá trị</div>
        </div>
        {deals.map((deal) => (
          <button
            key={deal.id}
            type="button"
            onClick={() => onOpenDeal(deal)}
            className="grid w-full grid-cols-[1.4fr_1fr_140px_150px] items-center gap-3 border-b border-border px-4 py-3 text-left text-sm last:border-b-0 hover:bg-secondary/60"
          >
            <div className="min-w-0">
              <div className="truncate font-semibold">{deal.projectType}</div>
              <div className="truncate text-xs text-muted-foreground">{deal.notes || "Chưa có ghi chú"}</div>
            </div>
            <div className="truncate text-muted-foreground">{deal.client}</div>
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2 py-1 text-xs font-medium">
              <span className={`h-2 w-2 rounded-full ${STAGE_BY_ID[deal.stage].dotClass}`} />
              {STAGE_BY_ID[deal.stage].shortTitle}
            </div>
            <div className="text-right font-mono font-semibold text-primary">{formatVND(deal.value)}</div>
          </button>
        ))}
        {deals.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Không tìm thấy yêu cầu phù hợp.
          </div>
        )}
      </div>
    </div>
  );
}
