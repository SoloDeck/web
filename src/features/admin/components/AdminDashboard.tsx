import { useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bot,
  Coins,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CreditCard,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import {
  useAdminPlans,
  useAdminUsers,
  useAiCosts,
  useAuditLogs,
  useCreateAdminPlan,
  useOverrideSubscription,
  useUpdateAdminPlan,
  useUpdateAdminUser,
} from "@/features/admin/hooks/useAdmin";
import { cn } from "@/lib/utils";
import type {
  AdminPlan,
  AdminPlanPayload,
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
} from "@/services/adminService";

export type AdminPage = "dashboard" | "users" | "plans" | "ai-costs" | "audit";

const ADMIN_NAV_ITEMS: {
  page: AdminPage;
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}[] = [
    {
      page: "dashboard",
      label: "Tổng quan",
      path: "/admin",
      icon: LayoutDashboard,
      description: "Tổng quan vận hành SoloDesk",
    },
    {
      page: "users",
      label: "Tài khoản",
      path: "/admin/users",
      icon: Users,
      description: "Quản lý người dùng và trạng thái truy cập",
    },
    {
      page: "plans",
      label: "Gói dịch vụ",
      path: "/admin/plans",
      icon: CreditCard,
      description: "Danh mục gói và giới hạn sử dụng",
    },
    // {
    //   page: "ai-costs",
    //   label: "Chi phí AI",
    //   path: "/admin/ai-costs",
    //   icon: Bot,
    //   description: "Token và chi phí ước tính mỗi lần gọi AI",
    // },
    // {
    //   page: "audit",
    //   label: "Nhật ký",
    //   path: "/admin/audit",
    //   icon: ScrollText,
    //   description: "Ai làm gì, cho ai, lúc nào",
    // },
  ];

const USER_ROLE_OPTIONS: { value: AdminUserRole; label: string }[] = [
  { value: "freelancer", label: "Người dùng" },
  { value: "admin", label: "Quản trị viên" },
];

const USER_STATUS_OPTIONS: { value: AdminUserStatus; label: string }[] = [
  { value: "active", label: "Đang hoạt động" },
  { value: "suspended", label: "Tạm khóa" },
  { value: "deleted", label: "Đã xóa" },
];

const USERS_PAGE_SIZE = 5;

export function AdminDashboard({ page = "dashboard" }: { page?: AdminPage }) {
  const currentUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const usersQuery = useAdminUsers();
  const plansQuery = useAdminPlans();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const users = usersQuery.data ?? [];
  const plans = plansQuery.data ?? [];
  const stats = useMemo(() => buildAdminStats(users, plans), [users, plans]);
  const activeRoute = ADMIN_NAV_ITEMS.find((item) => item.page === page) ?? ADMIN_NAV_ITEMS[0];
  const isLoading = usersQuery.isLoading || plansQuery.isLoading;
  const isError = usersQuery.isError || plansQuery.isError;

  function refresh() {
    usersQuery.refetch();
    plansQuery.refetch();
  }

  async function handleLogout() {
    await logout();
    window.location.assign("/login");
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-foreground">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
          aria-label="Đóng menu quản trị"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <AdminSidebar
        activePage={page}
        currentEmail={currentUser?.email ?? "admin@solodesk.dev"}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onLogout={handleLogout}
      />

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary lg:hidden"
                aria-label="Mở menu quản trị"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="size-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold sm:text-lg">{activeRoute.label}</h1>
                <p className="hidden truncate text-xs text-muted-foreground md:block">
                  {activeRoute.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SystemStatusPill isError={isError} isLoading={isLoading} />
              <Button type="button" variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Làm mới</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1540px] space-y-5 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
          {isLoading ? (
            <AdminLoadingState />
          ) : isError ? (
            <AdminErrorState onRefresh={refresh} />
          ) : page === "users" ? (
            <UsersPage users={users} stats={stats} />
          ) : page === "plans" ? (
            <PlansPage plans={plans} stats={stats} />
          ) : page === "ai-costs" ? (
            <AiCostsPage />
          ) : page === "audit" ? (
            <AuditLogPage />
          ) : (
            <DashboardPage users={users} stats={stats} />
          )}
        </main>
      </div>
    </div>
  );
}

function AdminSidebar({
  activePage,
  currentEmail,
  open,
  onClose,
  onLogout,
}: {
  activePage: AdminPage;
  currentEmail: string;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#1f2937] bg-[#101828] text-white shadow-xl transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-[#101828]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <div className="text-sm font-bold">Quản trị SoloDesk</div>
            <div className="text-xs text-white/55">Trung tâm quản trị</div>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
          aria-label="Đóng menu quản trị"
          onClick={onClose}
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Quản trị
          </p>
          <div className="mt-2 space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => (
              <AdminNavLink key={item.page} item={item} active={activePage === item.page} />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/8 p-3">
          <div className="text-xs text-white/45">Đang đăng nhập</div>
          <div className="mt-1 truncate text-sm font-semibold">{currentEmail}</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          <LogOut className="size-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

function AdminNavLink({
  item,
  active,
}: {
  item: (typeof ADMIN_NAV_ITEMS)[number];
  active: boolean;
}) {
  return (
    <a
      href={item.path}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-white text-[#101828] shadow-sm"
          : "text-white/72 hover:bg-white/10 hover:text-white",
      )}
    >
      <item.icon className="size-4" />
      <div className="min-w-0">
        <div className="font-semibold">{item.label}</div>
        <div className={cn("truncate text-xs", active ? "text-[#475467]" : "text-white/35")}>
          {item.description}
        </div>
      </div>
    </a>
  );
}

type AdminStats = ReturnType<typeof buildAdminStats>;

function DashboardPage({
  users,
  stats,
}: {
  users: AdminUser[];
  stats: AdminStats;
}) {
  const latestUsers = [...users].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Người dùng hoạt động"
          value={String(stats.activeUsers)}
          hint={`${stats.totalUsers} tài khoản toàn hệ thống`}
          tone="primary"
          progress={stats.totalUsers ? (stats.activeUsers / stats.totalUsers) * 100 : 0}
        />
        <MetricCard
          icon={CreditCard}
          label="Gói đang mở bán"
          value={`${stats.activePlans}/${stats.totalPlans}`}
          hint={`${stats.aiPlans} gói có AI, ${stats.pdfPlans} gói có PDF`}
          tone="success"
          progress={stats.totalPlans ? (stats.activePlans / stats.totalPlans) * 100 : 0}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Quản trị viên"
          value={String(stats.adminUsers)}
          hint="Tài khoản quản trị hệ thống"
          tone="default"
          progress={stats.totalUsers ? (stats.adminUsers / stats.totalUsers) * 100 : 0}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Tạm khóa"
          value={String(stats.suspendedUsers)}
          hint="Tài khoản đang bị hạn chế truy cập"
          tone="warning"
          progress={stats.totalUsers ? (stats.suspendedUsers / stats.totalUsers) * 100 : 0}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <PanelShell title="Tình trạng hệ thống" icon={BarChart3}>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat label="Quản trị viên" value={String(stats.adminUsers)} />
            <MiniStat label="Người dùng" value={String(stats.freelancerUsers)} />
            <MiniStat label="Tạm khóa" value={String(stats.suspendedUsers)} />
          </div>

          <div className="mt-5 space-y-4">
            <DistributionBar
              label="Tài khoản hoạt động"
              value={stats.activeUsers}
              total={Math.max(stats.totalUsers, 1)}
              tone="primary"
            />
            <DistributionBar
              label="Gói đang bán"
              value={stats.activePlans}
              total={Math.max(stats.totalPlans, 1)}
              tone="success"
            />
            <DistributionBar
              label="Tài khoản quản trị"
              value={stats.adminUsers}
              total={Math.max(stats.totalUsers, 1)}
              tone="default"
            />
          </div>
        </PanelShell>

        <PanelShell title="Tài khoản mới nhất" icon={Users}>
          <div className="space-y-2">
            {latestUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{user.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </div>
                <StatusPill status={user.status} />
              </div>
            ))}
            {latestUsers.length === 0 && <EmptyState text="Chưa có tài khoản nào trong hệ thống." />}
          </div>
        </PanelShell>
      </div>
    </div>
  );
}

function UsersPage({ users, stats }: { users: AdminUser[]; stats: AdminStats }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AdminUserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminUserStatus>("all");
  const [page, setPage] = useState(1);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesText =
        !term ||
        user.full_name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesText && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * USERS_PAGE_SIZE;
  const pageUsers = filteredUsers.slice(pageStart, pageStart + USERS_PAGE_SIZE);
  const firstVisible = filteredUsers.length === 0 ? 0 : pageStart + 1;
  const lastVisible = Math.min(pageStart + USERS_PAGE_SIZE, filteredUsers.length);

  useEffect(() => {
    // Khi lọc/tìm kiếm thay đổi, quay về trang đầu để tránh rơi vào trang rỗng.
    setPage(1);
  }, [query, roleFilter, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard compact icon={Users} label="Tổng tài khoản" value={String(stats.totalUsers)} hint="Tài khoản toàn hệ thống" tone="primary" />
        <MetricCard compact icon={CheckCircle2} label="Đang hoạt động" value={String(stats.activeUsers)} hint="Có thể truy cập hệ thống" tone="success" />
        <MetricCard compact icon={ShieldCheck} label="Quản trị viên" value={String(stats.adminUsers)} hint="Tài khoản quản trị" tone="default" />
        <MetricCard compact icon={AlertTriangle} label="Tạm khóa" value={String(stats.suspendedUsers)} hint="Cần kiểm tra lý do khóa" tone="warning" />
      </div>

      <PanelShell
        title="Quản lý tài khoản"
        icon={Users}
        action={<span className="text-xs font-semibold text-muted-foreground">{firstVisible}-{lastVisible} / {filteredUsers.length} kết quả</span>}
      >
        <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên hoặc email"
              className="h-9 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as "all" | AdminUserRole)}
            className="h-9 rounded-xl border border-input bg-background px-3 text-sm outline-none"
            aria-label="Lọc quyền"
          >
            <option value="all">Tất cả quyền</option>
            {USER_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | AdminUserStatus)}
            className="h-9 rounded-xl border border-input bg-background px-3 text-sm outline-none"
            aria-label="Lọc trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            {USER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="hidden grid-cols-[minmax(240px,1fr)_120px_150px_170px_136px] gap-3 border-b border-border bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
            <div>Người dùng</div>
            <div>Quyền</div>
            <div>Trạng thái</div>
            <div>Gói</div>
            <div className="text-right">Thao tác</div>
          </div>
          <div className="divide-y divide-border">
            {pageUsers.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </div>
        </div>
        <PaginationFooter
          currentPage={currentPage}
          pageCount={pageCount}
          firstVisible={firstVisible}
          lastVisible={lastVisible}
          total={filteredUsers.length}
          onPageChange={setPage}
        />
        {filteredUsers.length === 0 && <EmptyState text="Không tìm thấy người dùng phù hợp." />}
      </PanelShell>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const updateUser = useUpdateAdminUser();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<AdminUserRole>((user.role as AdminUserRole) || "freelancer");
  const [status, setStatus] = useState<AdminUserStatus>((user.status as AdminUserStatus) || "active");
  const hasChanges = role !== user.role || status !== user.status;

  function resetDraft() {
    setRole((user.role as AdminUserRole) || "freelancer");
    setStatus((user.status as AdminUserStatus) || "active");
    setEditing(false);
  }

  function save() {
    updateUser.mutate(
      {
        id: user.id,
        // Quản trị viên chỉ quản lý quyền truy cập, không chỉnh hồ sơ cá nhân của người dùng.
        payload: {
          role,
          status,
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <article className="grid gap-2 px-4 py-2 lg:grid-cols-[minmax(240px,1fr)_120px_150px_170px_136px] lg:items-center">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{user.full_name}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">Tạo ngày {formatDate(user.created_at)}</div>
      </div>

      {editing ? (
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as AdminUserRole)}
          className="w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none"
          aria-label="Quyền"
        >
          {USER_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <RolePill role={user.role} />
      )}

      {editing ? (
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as AdminUserStatus)}
          className="w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none"
          aria-label="Trạng thái"
        >
          {USER_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <StatusPill status={user.status} />
      )}

      {/* Gói của user + đổi gói ngay tại đây.
          Backend TRẢ KÈM `subscription` trong GET /admin/users, nhưng type AdminUser của
          frontend không khai nên vứt đi — cùng cái bẫy đã gặp với next_step của AI.

          Đây là cách DUY NHẤT để nâng gói: freelancer không tự nâng cấp được (tự nâng cấp
          đòi cổng thanh toán thật, nằm ngoài phạm vi đồ án). Admin thu tiền ngoài hệ thống
          rồi kích hoạt ở đây.  #Huynh */}
      <PlanCell user={user} />

      <div className="flex min-w-0 justify-end gap-1.5">
        {editing ? (
          <>
            <Button type="button" variant="ghost" size="sm" className="px-2" onClick={resetDraft} disabled={updateUser.isPending}>
              <X className="size-4" />
              Hủy
            </Button>
            <Button type="button" size="sm" className="px-2" onClick={save} disabled={!hasChanges || updateUser.isPending}>
              {updateUser.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Lưu
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            Sửa
          </Button>
        )}
      </div>
    </article>
  );
}

function PaginationFooter({
  currentPage,
  pageCount,
  firstVisible,
  lastVisible,
  total,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  firstVisible: number;
  lastVisible: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Hiển thị {firstVisible}-{lastVisible} trong {total} tài khoản
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="size-4" />
          Trước
        </Button>
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={cn(
              "grid size-8 place-items-center rounded-lg border text-xs font-semibold transition-colors",
              item === currentPage
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            aria-label={`Trang ${item}`}
            aria-current={item === currentPage ? "page" : undefined}
          >
            {item}
          </button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
        >
          Sau
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function PlansPage({ plans, stats }: { plans: AdminPlan[]; stats: AdminStats }) {
  const createPlan = useCreateAdminPlan();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard icon={CreditCard} label="Tổng gói" value={String(stats.totalPlans)} hint="Danh mục gói dịch vụ" tone="primary" />
        <MetricCard icon={CheckCircle2} label="Đang mở bán" value={String(stats.activePlans)} hint="Có thể bán cho người dùng" tone="success" />
        <MetricCard icon={Bot} label="Gói có AI" value={String(stats.aiPlans)} hint="Cho phép tạo nội dung bằng AI" tone="default" />
        <MetricCard icon={FileText} label="Gói có PDF" value={String(stats.pdfPlans)} hint="Cho phép xuất PDF" tone="warning" />
      </div>

      <PanelShell
        title="Danh mục gói dịch vụ"
        icon={CreditCard}
        action={
          <Button type="button" size="sm" onClick={() => setShowCreate((current) => !current)}>
            {showCreate ? <X className="size-4" /> : <Plus className="size-4" />}
            {showCreate ? "Đóng form" : "Tạo gói"}
          </Button>
        }
      >
        {showCreate && (
          <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <PlanForm
              submitLabel="Tạo gói mới"
              isSubmitting={createPlan.isPending}
              onCancel={() => setShowCreate(false)}
              onSubmit={(payload) => {
                createPlan.mutate(payload, { onSuccess: () => setShowCreate(false) });
              }}
            />
          </div>
        )}

        <div className="grid gap-3 xl:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
        {plans.length === 0 && <EmptyState text="Chưa có gói dịch vụ nào." />}
      </PanelShell>
    </div>
  );
}

function PlanCard({ plan }: { plan: AdminPlan }) {
  const updatePlan = useUpdateAdminPlan();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <article className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <PlanForm
          plan={plan}
          submitLabel="Lưu gói"
          isSubmitting={updatePlan.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={(payload) => {
            updatePlan.mutate({ id: plan.id, payload }, { onSuccess: () => setEditing(false) });
          }}
        />
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold">{plan.name}</h3>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {plan.slug}
            </span>
            <PlanStatePill active={plan.is_active} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatMoney(plan.price_monthly, plan.currency)} / tháng · {plan.can_use_ai ? "Có AI" : "Không AI"} · {plan.can_export_pdf ? "Có PDF" : "Không PDF"}
          </p>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <span>Khách hàng: {plan.max_clients ?? "Không giới hạn"}</span>
            <span>Dự án: {plan.max_deals ?? "Không giới hạn"}</span>
            <span>Lượt AI/tháng: {plan.max_ai_generations_per_month}</span>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="size-4" />
          Sửa gói
        </Button>
      </div>
    </article>
  );
}

type PlanDraft = {
  name: string;
  slug: string;
  price_monthly: string;
  can_use_ai: boolean;
  can_export_pdf: boolean;
  max_clients: string;
  max_deals: string;
  max_ai_generations_per_month: string;
  is_active: boolean;
};

function PlanForm({
  plan,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  plan?: AdminPlan;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (payload: AdminPlanPayload) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<PlanDraft>(() => toPlanDraft(plan));
  const isEditing = Boolean(plan);
  const canSubmit =
    draft.name.trim().length > 0 &&
    Number(draft.max_ai_generations_per_month || 0) >= 0;

  function set(field: keyof PlanDraft, value: string | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit(toPlanPayload(draft));
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TextInput
          label="Tên gói"
          value={draft.name}
          onChange={(value) =>
            // Tạo mới: mã gói sinh theo tên, admin khỏi nghĩ. SỬA gói: giữ nguyên mã cũ —
            // code tra gói theo mã (vd `slug == "free"` lúc đăng ký), đổi mã là gãy.  #Huynh
            setDraft((current) => ({
              ...current,
              name: value,
              slug: isEditing ? current.slug : slugifyPlanName(value),
            }))
          }
        />

        {/* Giá luôn VND — hệ thống cho người Việt, không hỏi tiền tệ nữa. Gõ tới đâu chấm
            ngăn nghìn tới đó: 2000 -> 2.000  #Huynh */}
        <TextInput
          label="Giá tháng (VND)"
          value={draft.price_monthly}
          inputMode="numeric"
          onChange={(value) => set("price_monthly", groupThousands(onlyDigits(value)))}
        />
        <TextInput
          label="Giới hạn khách hàng"
          value={draft.max_clients}
          inputMode="numeric"
          placeholder="Trống = không giới hạn"
          onChange={(value) => set("max_clients", onlyDigits(value))}
        />
        <TextInput
          label="Giới hạn dự án"
          value={draft.max_deals}
          inputMode="numeric"
          placeholder="Trống = không giới hạn"
          onChange={(value) => set("max_deals", onlyDigits(value))}
        />
        <TextInput
          label="AI/tháng"
          value={draft.max_ai_generations_per_month}
          inputMode="numeric"
          onChange={(value) => set("max_ai_generations_per_month", onlyDigits(value))}
        />
      </div>

      {/* Mã gói KHÔNG bắt gõ tay nữa — tự sinh từ tên. Vẫn hiện ra để admin biết nó tồn
          tại và vì sao: code tra gói theo MÃ, nên đổi tên gói không làm gãy gì.  #Huynh */}
      {(draft.slug || draft.name) && (
        <p className="text-xs text-muted-foreground">
          Mã gói:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
            {draft.slug || slugifyPlanName(draft.name)}
          </code>{" "}
          — {isEditing
            ? "giữ nguyên khi sửa, vì hệ thống tra gói theo mã này."
            : "tự sinh từ tên. Hệ thống tra gói theo mã, nên sau này đổi tên gói không ảnh hưởng gì."}
        </p>
      )}

      <div className="flex flex-wrap gap-4 border-t border-border pt-4">
        <CheckboxField label="Cho phép dùng AI" checked={draft.can_use_ai} onChange={(checked) => set("can_use_ai", checked)} />
        <CheckboxField label="Cho phép xuất PDF" checked={draft.can_export_pdf} onChange={(checked) => set("can_export_pdf", checked)} />
        <CheckboxField label="Gói đang hoạt động" checked={draft.is_active} onChange={(checked) => set("is_active", checked)} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function PanelShell({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card shadow-sm", className)}>
      {(title || action) && (
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
            )}
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  progress,
  compact = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "success" | "warning" | "default";
  progress?: number;
  compact?: boolean;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "success"
        ? "bg-success/10 text-success"
        : tone === "warning"
          ? "bg-warning/15 text-warning-foreground"
          : "bg-secondary text-foreground";

  return (
    <section className={cn("rounded-2xl border border-border bg-card shadow-sm", compact ? "p-3" : "p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className={cn("grid place-items-center", compact ? "size-8 rounded-lg" : "size-10 rounded-xl", toneClass)}>
          <Icon className={compact ? "size-3.5" : "size-4"} />
        </div>
        {progress !== undefined && (
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <p className={cn("text-xs font-medium text-muted-foreground", compact ? "mt-2" : "mt-4")}>{label}</p>
      <p className={cn("mt-0.5 font-bold tracking-tight", compact ? "text-2xl" : "text-3xl")}>{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
      {progress !== undefined && (
        <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", compact ? "mt-2" : "mt-4")}>
          <div className={cn("h-full rounded-full", toneClass)} style={{ width: `${clamp(progress)}%` }} />
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function DistributionBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "primary" | "success" | "default";
}) {
  const percent = total ? (value / total) * 100 : 0;
  const barClass = tone === "primary" ? "bg-primary" : tone === "success" ? "bg-success" : "bg-foreground";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">
          {value}/{total}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${clamp(percent)}%` }} />
      </div>
    </div>
  );
}

function AdminLoadingState() {
  return (
    <PanelShell>
      <div className="grid min-h-80 place-items-center text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Đang tải dữ liệu quản trị...
        </span>
      </div>
    </PanelShell>
  );
}

function AdminErrorState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <PanelShell>
      <div className="grid min-h-80 place-items-center text-center text-sm text-muted-foreground">
        <div>
          <XCircle className="mx-auto mb-3 size-10 text-destructive" />
          <p className="font-semibold text-foreground">Không thể tải dữ liệu quản trị</p>
          <p className="mt-1">Hãy kiểm tra phiên đăng nhập hoặc trạng thái máy chủ.</p>
          <Button type="button" className="mt-4" onClick={onRefresh}>
            <RefreshCw className="size-4" />
            Thử lại
          </Button>
        </div>
      </div>
    </PanelShell>
  );
}

function SystemStatusPill({ isLoading, isError }: { isLoading: boolean; isError: boolean }) {
  if (isLoading) {
    return (
      <span className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:inline-flex">
        <Loader2 className="size-3 animate-spin" />
        Đang đồng bộ
      </span>
    );
  }

  return (
    <span
      className={cn(
        "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold sm:inline-flex",
        isError
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-success/25 bg-success/10 text-success",
      )}
    >
      <span className="size-2 rounded-full bg-current" />
      {isError ? "Mất kết nối" : "Hệ thống sẵn sàng"}
    </span>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  inputMode,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = USER_STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
  const cls =
    status === "active"
      ? "bg-success/10 text-success"
      : status === "suspended"
        ? "bg-warning/15 text-warning-foreground"
        : "bg-destructive/10 text-destructive";
  return <span className={cn("w-fit rounded-full px-2 py-1 text-xs font-semibold", cls)}>{label}</span>;
}

function formatRole(role: string): string {
  return USER_ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role;
}

function RolePill({ role }: { role: string }) {
  const cls = role === "admin" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground";
  return <span className={cn("w-fit rounded-full px-2 py-1 text-xs font-semibold", cls)}>{formatRole(role)}</span>;
}

function PlanStatePill({ active }: { active: boolean }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
      {active ? "Đang bật" : "Đang tắt"}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <FileText className="mx-auto mb-3 size-8 text-muted-foreground/60" />
      {text}
    </div>
  );
}

function buildAdminStats(users: AdminUser[], plans: AdminPlan[]) {
  return {
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.status === "active").length,
    suspendedUsers: users.filter((user) => user.status === "suspended").length,
    adminUsers: users.filter((user) => user.role === "admin").length,
    freelancerUsers: users.filter((user) => user.role === "freelancer").length,
    totalPlans: plans.length,
    activePlans: plans.filter((plan) => plan.is_active).length,
    aiPlans: plans.filter((plan) => plan.can_use_ai).length,
    pdfPlans: plans.filter((plan) => plan.can_export_pdf).length,
  };
}

/**
 * Sinh MÃ GÓI từ tên. Admin không phải tự nghĩ ra mã.
 *
 * Vì sao gói cần MÃ riêng bên cạnh TÊN: tên là để HIỂN THỊ (admin đổi thoải mái), còn mã là
 * KHOÁ CODE — code tra gói theo mã, ví dụ lúc đăng ký tự gán gói miễn phí (`slug == "free"`).
 * Đổi tên "Free" thành "Miễn phí" mà mã giữ nguyên thì không gì hỏng. Nếu gộp làm một, đổi
 * tên là gãy đăng ký.  #Huynh
 */
function slugifyPlanName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/** Chấm ngăn nghìn kiểu Việt: "2000" -> "2.000" */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function toPlanDraft(plan?: AdminPlan): PlanDraft {
  return {
    name: plan?.name ?? "",
    slug: plan?.slug ?? "",
    price_monthly: plan ? groupThousands(onlyDigits(String(plan.price_monthly))) : "",
    can_use_ai: plan?.can_use_ai ?? false,
    can_export_pdf: plan?.can_export_pdf ?? false,
    max_clients: plan?.max_clients == null ? "" : String(plan.max_clients),
    max_deals: plan?.max_deals == null ? "" : String(plan.max_deals),
    max_ai_generations_per_month: String(plan?.max_ai_generations_per_month ?? 0),
    is_active: plan?.is_active ?? true,
  };
}

function toPlanPayload(draft: PlanDraft): AdminPlanPayload {
  return {
    name: draft.name.trim(),
    // Mã gói tự sinh từ tên khi tạo mới; sửa gói thì giữ nguyên mã cũ (đổi mã có thể làm
    // gãy code tra gói theo mã).
    slug: draft.slug.trim() || slugifyPlanName(draft.name),
    // Bỏ dấu chấm ngăn nghìn trước khi gửi: "2.000" -> "2000".
    price_monthly: onlyDigits(draft.price_monthly) || "0",
    // Hệ thống cho người Việt — luôn VND, không hỏi.  #Huynh
    currency: "VND",
    can_use_ai: draft.can_use_ai,
    can_export_pdf: draft.can_export_pdf,
    max_clients: toNullableNumber(draft.max_clients),
    max_deals: toNullableNumber(draft.max_deals),
    max_ai_generations_per_month: Number(draft.max_ai_generations_per_month || 0),
    is_active: draft.is_active,
  };
}

function toNullableNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatMoney(value: string | number, currency: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) return `${value} ${currency}`;
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "VND" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("vi-VN")} ${currency}`;
  }
}

/** Gói hiện tại của user + đổi gói (admin only). */
function PlanCell({ user }: { user: AdminUser }) {
  const { data: plans } = useAdminPlans();
  const override = useOverrideSubscription();
  const [open, setOpen] = useState(false);

  const sub = user.subscription;
  const planName = sub?.plan_name ?? sub?.plan_slug ?? "—";

  if (!sub) {
    return <div className="text-sm text-muted-foreground">Chưa có gói</div>;
  }

  if (!open) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium">{planName}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() => setOpen(true)}
        >
          Đổi
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <select
        defaultValue={sub.plan_id}
        onChange={(event) => {
          const planId = event.target.value;
          if (planId === sub.plan_id) {
            setOpen(false);
            return;
          }
          override.mutate(
            { subscriptionId: sub.id, planId },
            { onSettled: () => setOpen(false) }
          );
        }}
        disabled={override.isPending}
        className="w-full min-w-0 rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none"
        aria-label="Đổi gói"
      >
        {(plans ?? []).map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name}
          </option>
        ))}
      </select>
      {override.isPending ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-1.5"
          onClick={() => setOpen(false)}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

/**
 * Chi phí AI toàn hệ thống.
 *
 * Bảng `ai_cost_records` và endpoint này đã có sẵn từ lâu nhưng KHÔNG AI GHI VÀO — bảng
 * 0 dòng. Backend vừa được vá: mỗi lần gọi Groq giờ lưu số token thật + chi phí ước tính.
 *
 * "Ước tính" là đúng nghĩa đen: Groq tính tiền theo bảng giá của họ, con số ở đây là ta
 * tự nhân đơn giá. Giao diện phải nói rõ, đừng để ai tưởng đây là hoá đơn.  #Huynh
 */
function AiCostsPage() {
  const { data, isLoading } = useAiCosts();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Đang tải chi phí AI...
      </div>
    );
  }

  const rows = data?.data ?? [];
  const totals = data?.totals;
  const totalCost = Number(totals?.estimated_cost_usd ?? 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard compact icon={Bot} label="Lượt gọi AI" value={String(data?.total ?? 0)} hint="Toàn hệ thống" tone="primary" />
        <MetricCard compact icon={Coins} label="Chi phí ước tính" value={`$${totalCost.toFixed(4)}`} hint="Không phải hoá đơn thật" tone="warning" />
        <MetricCard compact icon={ArrowDownToLine} label="Token vào" value={(totals?.input_tokens ?? 0).toLocaleString("vi-VN")} hint="Prompt gửi lên" tone="default" />
        <MetricCard compact icon={ArrowUpFromLine} label="Token ra" value={(totals?.output_tokens ?? 0).toLocaleString("vi-VN")} hint="Model trả về" tone="success" />
      </div>

      <PanelShell title="Lịch sử gọi AI" icon={Bot}>
        {rows.length === 0 ? (
          <EmptyState text="Chưa có lượt gọi AI nào được ghi nhận." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="hidden grid-cols-[150px_minmax(0,1fr)_90px_90px_110px_150px] gap-3 border-b border-border bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
              <div>Tính năng</div>
              <div>Model</div>
              <div className="text-right">Token vào</div>
              <div className="text-right">Token ra</div>
              <div className="text-right">Ước tính</div>
              <div className="text-right">Thời điểm</div>
            </div>
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div key={row.id} className="grid gap-1 px-4 py-2 text-sm lg:grid-cols-[150px_minmax(0,1fr)_90px_90px_110px_150px] lg:items-center">
                  <div className="font-medium">{AI_MODULE_LABEL[row.ai_module] ?? row.ai_module}</div>
                  <div className="truncate text-xs text-muted-foreground">{row.model_used}</div>
                  <div className="text-right tabular-nums">{row.input_tokens.toLocaleString("vi-VN")}</div>
                  <div className="text-right tabular-nums">{row.output_tokens.toLocaleString("vi-VN")}</div>
                  <div className="text-right tabular-nums">${Number(row.estimated_cost_usd).toFixed(6)}</div>
                  <div className="text-right text-xs text-muted-foreground">{formatDateTime(row.occurred_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Chi phí là <span className="font-semibold">ước tính</span> (số token × đơn giá Groq). Hoá đơn
          thật xem ở console.groq.com.
        </p>
      </PanelShell>
    </div>
  );
}

/**
 * Nhật ký hành động của admin.
 *
 * Quan trọng vì freelancer KHÔNG tự nâng cấp gói được — admin thu tiền ngoài hệ thống rồi
 * kích hoạt tay. Mô hình đó chỉ đứng vững nếu mọi lần kích hoạt để lại dấu vết: ai làm,
 * cho ai, lúc nào. Không có nhật ký thì "admin kích hoạt thủ công" chỉ là một cái cửa sau.
 */
function AuditLogPage() {
  const { data: logs, isLoading } = useAuditLogs();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Đang tải nhật ký...
      </div>
    );
  }

  return (
    <PanelShell title="Nhật ký hệ thống" icon={ScrollText}>
      {!logs || logs.length === 0 ? (
        <EmptyState text="Chưa có hoạt động nào được ghi nhận." />
      ) : (
        <ol className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", AUDIT_TONE[log.event_type] ?? "bg-muted-foreground/40")} />
              <div className="min-w-0 flex-1">
                <div className="text-sm">{log.description}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{log.event_type}</span>
                  <span>{formatDateTime(log.occurred_at)}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </PanelShell>
  );
}

const AI_MODULE_LABEL: Record<string, string> = {
  lead_qualifier: "Chấm điểm deal",
  proposal_generator: "Soạn báo giá",
  contract_generator: "Soạn hợp đồng",
  followup_generator: "Nhắc khách",
};

const AUDIT_TONE: Record<string, string> = {
  "subscription.overridden": "bg-primary",
  "plan.created": "bg-emerald-500",
  "plan.updated": "bg-amber-500",
  "user.suspended": "bg-destructive",
  "user.reinstated": "bg-emerald-500",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
