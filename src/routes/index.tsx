import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Filter,
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
import { getMe, updateMe, updateFreelancerProfile, updateProfessionalProfile } from "@/services/usersService";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api-error";
import { wasOnboardingSkipped } from "@/features/onboarding/skip";
import type { Deal } from "@/features/deals/types";
import { formatVND } from "@/utils/format";
import type { Profile } from "@/features/profile/types";
import type { ClientRecord } from "@/services/clientsService";

type NavKey = "pipeline" | "clients" | "revenue" | "intake-form" | "settings" | "subscription";

const NAV_KEYS: NavKey[] = [
  "pipeline",
  "clients",
  "revenue",
  "intake-form",
  "settings",
  "subscription",
];

type IndexSearch = { tab?: NavKey };

export const Route = createFileRoute("/")({
  // Tab hiện tại được lưu ở query param `?tab=` để nút back và link chia sẻ mở đúng màn hình.
  validateSearch: (search: Record<string, unknown>): IndexSearch => {
    const tab = search.tab as NavKey | undefined;
    return { tab: tab && NAV_KEYS.includes(tab) ? tab : undefined };
  },
  beforeLoad: async () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/home", replace: true });
    }
    if (user?.role === "admin") {
      throw redirect({ to: "/admin", replace: true });
    }

    // Chặn ở đây chứ không chỉ ở cửa đăng nhập: người đang có sẵn phiên đăng nhập
    // mở thẳng app sẽ không đi qua /login, nên nếu chỉ gác ở đó thì họ không bao
    // giờ được hỏi. Ai bấm "Bỏ qua" trong phiên này thì để yên.
    if (wasOnboardingSkipped()) return;

    let me = null;
    try {
      me = await getMe();
    } catch {
      // Lỗi mạng: đừng chặn người dùng ở cửa, cứ cho vào workspace.
    }

    // redirect() điều hướng bằng cách ném — phải nằm ngoài try/catch ở trên.
    if (me && !me.professional_profile?.specialization) {
      throw redirect({ to: "/onboarding", replace: true });
    }
  },
  component: Index,
});

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
      // Ghi tên + SĐT trước rồi mới tới phần còn lại: SĐT là UNIQUE ở BE, gộp hết
      // vào Promise.all thì SĐT trùng (409) nhưng bio/kỹ năng/mức giá vẫn được lưu
      // — hồ sơ rơi vào trạng thái nửa vời mà người dùng không hề biết.
      await updateMe({ full_name: p.fullName, phone: p.phone || undefined });

      await Promise.all([
        updateFreelancerProfile({
          professional_title: p.professionalTitle || undefined,
          bio: p.bio || undefined,
          skills: p.skills.length > 0 ? p.skills : undefined,
          service_categories: p.serviceCategories.length > 0 ? p.serviceCategories : undefined,
          avatar_url: p.avatarUrl || undefined,
          portfolio_url: p.portfolioUrl || undefined,
          is_listed: p.isListed,
        }),
        // Mức giá theo giờ lưu lên server để không mất khi đổi máy (trước đây chỉ
        // nằm ở localStorage). Lưu ý: hiện KHÔNG module AI nào đọc trường này —
        // lead_qualifier tự ước lượng giá thị trường từ mô tả dự án.
        updateProfessionalProfile({
          default_hourly_rate: p.hourlyRate > 0 ? p.hourlyRate : undefined,
          currency: "VND",
        }),
      ]);
      updateUser({ fullName: p.fullName });
      toast.success("Đã lưu hồ sơ.");
    } catch (err) {
      // BE nay ràng buộc UNIQUE trên email/phone → 409 kèm thông điệp cụ thể.
      // Hiện đúng thông điệp đó, thay vì nuốt vào một câu chung chung.
      if (getApiErrorStatus(err) === 409) {
        toast.error(
          getApiErrorMessage(err, "Số điện thoại đã được tài khoản khác sử dụng.")
        );
        return;
      }
      toast.error("Không thể lưu hồ sơ lên server. Thay đổi vẫn được lưu cục bộ.");
    }
  }, [setProfile, updateUser]);

  const [newDealOpen, setNewDealOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [proposal, setProposal] = useState<Deal | null>(null);
  const [aiDeal, setAiDeal] = useState<Deal | null>(null);
  const [query, setQuery] = useState("");
  // Tab lấy từ URL (?tab=) để nút back từ trang chi tiết mở lại đúng màn hình.
  const { tab } = Route.useSearch();
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
