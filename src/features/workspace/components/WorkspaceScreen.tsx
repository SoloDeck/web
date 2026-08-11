import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Menu, Plus, Search } from "lucide-react";
import { AppSidebar } from "@/components/layout/Sidebar";
import { KanbanBoard } from "@/features/deals/components/KanbanBoard";
import { NewDealModal } from "@/features/deals/components/NewDealModal";
import { useAIActivityStore } from "@/features/ai/hooks/useAIActivityStore";
import { AIActivityCenter } from "@/features/ai/components/AIActivityCenter";
import { ProfileSettings } from "@/features/profile/components/ProfileSettings";
import { ClientRecords } from "@/features/clients/components/ClientRecords";
import { RevenueDashboard } from "@/features/revenue/components/RevenueDashboard";
import { IntakeFormConfig } from "@/features/intake/components/IntakeFormConfig";
import { SubscriptionPage } from "@/features/subscriptions/components/SubscriptionPage";
import { useDeals } from "@/features/deals/hooks/useDeals";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { useSaveProfile } from "@/features/profile/hooks/useSaveProfile";
import type { NavKey } from "@/features/workspace/navKeys";
import type { Deal } from "@/features/deals/types";
import { formatVND } from "@/utils/format";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import type { ClientRecord } from "@/services/clientsService";

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
    title: "Trang công khai",
    description: "Dựng trang khách sẽ mở: diện mạo, biểu mẫu tiếp nhận và link chia sẻ.",
  },
  settings: {
    title: "Cài đặt hồ sơ",
    description: "Cập nhật thông tin freelancer và mẫu điều khoản.",
  },
  subscription: {
    title: "Gói dịch vụ",
    description: "Xem và quản lý gói dịch vụ SoloDesk của bạn.",
  },
};

/**
 * Đọc query param của route `/` mà KHÔNG import file route.
 *
 * `Route.useSearch()` như bản cũ buộc file này phụ thuộc ngược lên `routes/index.tsx`, thành
 * vòng tròn — mà chính cái vòng đó là lý do trước đây toàn bộ workspace nằm trong gói khởi
 * động. `getRouteApi` tra bằng id lúc chạy nên phụ thuộc chỉ đi một chiều: route biết màn
 * hình, màn hình không biết route.  #Huynh
 */
const route = getRouteApi("/");

export function WorkspaceScreen() {
  const navigate = useNavigate();
  const { deals, isLoading } = useDeals();
  const { profile, setProfile } = useProfile();
  const currentUser = useAuthStore((s) => s.user);

  const handleSaveProfile = useSaveProfile(setProfile);

  const [newDealOpen, setNewDealOpen] = useState(false);
  const openAiPanel = useAIActivityStore((state) => state.openPanel);
  const [query, setQuery] = useState("");
  // Tab lấy từ URL (?tab=) để nút back từ trang chi tiết mở lại đúng màn hình.
  const { tab } = route.useSearch();
  const nav: NavKey = tab ?? "pipeline";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pageMeta = PAGE_META[nav];

  const goToTab = useCallback(
    (nextNav: NavKey) => {
      // pipeline là mặc định → bỏ query cho URL gọn ("/").
      navigate({ to: "/", search: nextNav === "pipeline" ? {} : { tab: nextNav } });
    },
    [navigate]
  );

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

  // Panel AI được mount ở tầng gốc (AIJobViewer) nên ở đây chỉ cần báo store muốn mở cái
  // gì. Trước đây trang này TỰ mount ProposalModal + AIPanel — trùng với panel của trang
  // chi tiết, và bấm "Xem" trên thẻ job thì mỗi trang hiểu một kiểu.  #Huynh
  const handleAiAction = useCallback((deal: Deal) => {
    if (deal.stage === "new_lead") {
      openAiPanel({ kind: "deal_qualification", dealId: deal.id });
      return;
    }
    if (deal.stage === "in_negotiation") {
      navigate({ to: "/deals/$dealId", params: { dealId: deal.id } });
      return;
    }
    openAiPanel({ kind: "proposal_generation", dealId: deal.id });
  }, [navigate, openAiPanel]);

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
          goToTab(nextNav);
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
              {/* Đã gỡ nút "Bộ lọc": nó chưa bao giờ có `onClick` — bấm vào không xảy ra gì.
                  Một cái nút bấm không phản ứng còn tệ hơn là không có nút, vì người dùng
                  tưởng mình bấm sai chỗ rồi bấm lại mấy lần. Ô tìm kiếm bên trái đã lọc
                  được deal theo tên khách/tên yêu cầu, nên chỗ này không hụt chức năng.  #Huynh */}
              <NotificationBell />
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
                      <button
                        onClick={() => setNewDealOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 sm:hidden"
                      >
                        <Plus className="h-4 w-4" /> Thêm
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
                    <KanbanBoard
                      deals={filtered}
                      onCardClick={openDeal}
                      onDraft={handleAiAction}
                      onAddDeal={() => setNewDealOpen(true)}
                    />
                  </div>
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
                />
              )}
            </>
          )}
        </div>
      </main>

      <NewDealModal open={newDealOpen} onClose={() => setNewDealOpen(false)} />
      <AIActivityCenter />
    </div>
  );
}
