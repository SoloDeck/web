import { useEffect, useId, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
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
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";
import {
  useAdminPlans,
  useAdminTemplates,
  useAdminUsers,
  useAiCosts,
  useAuditLogs,
  useCreateAdminPlan,
  useCreateAdminTemplate,
  useDeleteAdminPlan,
  useOverrideSubscription,
  useUpdateAdminPlan,
  useUpdateAdminTemplate,
  useUpdateAdminUser,
  useAdminLLMProvider,
  useUpdateAdminLLMProvider,
} from "@/features/admin/hooks/useAdmin";
import { PROFESSIONS } from "@/features/profile/types";
import { cn } from "@/lib/utils";
import type {
  AdminPlan,
  AdminPlanPayload,
  AdminTemplate,
  AdminTemplateType,
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
  LLMProvider,
} from "@/services/adminService";
import { isMomoPayableAmount } from "@/services/subscriptionsService";

/**
 * Mã gói miễn phí. Đây là gói HỆ THỐNG, không phải một mặt hàng trong bảng giá: người
 * đăng ký mới được gán vào nó, và job hết hạn hạ mọi gói trả phí về nó. Backend từ chối
 * xoá nó — nên đừng bày ra một cái nút chắc chắn hỏng.  #Huynh
 */
const FREE_PLAN_SLUG = "free";

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


/**
 * Tab Tổng quan — màn duy nhất cần CẢ tài khoản lẫn gói.
 *
 * Từ đây trở đi mỗi tab tự gọi truy vấn của riêng nó thay vì nhận qua prop từ khung. Đó
 * là điều làm cho "không tải dữ liệu thừa" thành ràng buộc CẤU TRÚC chứ không phải may
 * mắn: tab Nhật ký không có cách nào chạm tới `useAdminUsers` nữa. TanStack Query gộp
 * trùng theo queryKey nên vẫn chỉ đúng một lượt mạng cho mỗi khoá.  #Huynh
 */
export function AdminDashboardPage() {
  const usersQuery = useAdminUsers();
  const plansQuery = useAdminPlans();

  // `?? []` phải nằm TRONG `useMemo`, không phải ngoài: viết ngoài thì mỗi lần render lại
  // sinh một mảng rỗng mới, phụ thuộc của `useMemo` đổi liên tục và bộ nhớ đệm thành vô nghĩa.
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const stats = useMemo(
    () => ({ ...buildUserStats(users), ...buildPlanStats(plans) }),
    [users, plans],
  );
  const latestUsers = useMemo(
    () => [...users].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6),
    [users],
  );

  // Màn chờ và màn lỗi nằm TRONG tab, không phải ở khung. Mọi hook phải gọi xong trước
  // các nhánh `return` sớm này — luật hook, và React Compiler đang bật.
  if (usersQuery.isLoading || plansQuery.isLoading) return <AdminLoadingState />;
  if (usersQuery.isError || plansQuery.isError) {
    return (
      <AdminErrorState
        onRefresh={() => {
          usersQuery.refetch();
          plansQuery.refetch();
        }}
      />
    );
  }

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

export function AdminUsersPage() {
  const usersQuery = useAdminUsers();
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const stats = useMemo(() => buildUserStats(users), [users]);

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

  if (usersQuery.isLoading) return <AdminLoadingState />;
  if (usersQuery.isError) return <AdminErrorState onRefresh={() => usersQuery.refetch()} />;

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

export function AdminPlansPage() {
  const plansQuery = useAdminPlans();
  const createPlan = useCreateAdminPlan();
  const [showCreate, setShowCreate] = useState(false);

  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const stats = useMemo(() => buildPlanStats(plans), [plans]);

  if (plansQuery.isLoading) return <AdminLoadingState />;
  if (plansQuery.isError) return <AdminErrorState onRefresh={() => plansQuery.refetch()} />;

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
  const deletePlan = useDeleteAdminPlan();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            Sửa gói
          </Button>
          {plan.slug !== FREE_PLAN_SLUG && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="size-4" />
              Xoá
            </Button>
          )}
        </div>
      </div>

      {/* Hộp thoại riêng, không phải một khối nở ra trong thẻ gói: xoá là hành động không
          hoàn tác được, nên nó xứng đáng một lần dừng hẳn lại — chặn thao tác khác, ghim
          tiêu điểm, Esc để thoát. `ConfirmDialog` của dự án lo sẵn cả ba.  #Huynh */}
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Xoá hẳn gói “${plan.name}”?`}
        description={
          "Không hoàn tác được. Chỉ xoá được gói chưa ai đăng ký và chưa từng có giao dịch " +
          "nào. Gói đã có người dùng thì hãy bỏ chọn “Gói đang hoạt động” để ngừng bán: gói " +
          "biến khỏi bảng giá và không ai mua mới được, còn người đang dùng vẫn giữ quyền " +
          "lợi tới hết kỳ đã trả tiền."
        }
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        tone="danger"
        isLoading={deletePlan.isPending}
        onConfirm={() =>
          deletePlan.mutate(plan.id, { onSuccess: () => setConfirmingDelete(false) })
        }
      />
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
  const [priceError, setPriceError] = useState<string | null>(null);
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

    // Soi giá lúc BẤM LƯU, không phải lúc đang gõ. Gõ "1.000.000" thì có một khoảnh khắc
    // giá trị là "1" — báo đỏ ngay lúc đó là mắng người ta giữa chừng câu. Còn treo sẵn
    // một dòng hướng dẫn suốt thời gian mở form thì lại thành nhiễu, đọc vài lần là hết
    // nhìn. Chỉ nói khi người dùng đã nói xong.
    //
    // 0đ = gói miễn phí, không đi qua cổng thanh toán nên không chịu hạn mức nào.  #Huynh
    const price = Number(onlyDigits(draft.price_monthly) || "0");
    if (price !== 0 && !isMomoPayableAmount(price)) {
      setPriceError(
        "Giá gói phải từ 1.000đ đến 50.000.000đ (hạn mức MoMo), hoặc để 0 nếu là gói miễn phí."
      );
      return;
    }

    setPriceError(null);
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
          error={priceError}
          onChange={(value) => {
            // Gõ lại là xoá lỗi ngay: giữ chữ đỏ trong khi người ta đang sửa đúng chỗ
            // được bảo là sai thì chỉ còn là cằn nhằn.
            setPriceError(null);
            set("price_monthly", groupThousands(onlyDigits(value)));
          }}
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

function TextInput({
  label,
  value,
  placeholder,
  inputMode,
  onChange,
  error,
}: {
  label: string;
  value: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
  onChange: (value: string) => void;
  /** Lỗi của RIÊNG ô này, hiện ngay dưới ô. `null` = chưa có gì để nói.  #Huynh */
  error?: string | null;
}) {
  const errorId = useId();
  return (
    <div className="space-y-1.5">
      {/* Câu báo lỗi nằm NGOÀI <label>, nối vào ô bằng `aria-describedby`. Nhét nó vào
          trong label thì nó bị tính luôn vào tên gọi của ô, thành "Giá tháng (VND)Giá gói
          phải từ 1.000đ…" — trình đọc màn hình đọc cả cục đó mỗi lần vào ô.  #Huynh */}
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold">{label}</span>
        <input
          value={value}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2",
            error
              ? "border-destructive focus:ring-destructive/40"
              : "border-input focus:ring-ring"
          )}
        />
      </label>
      {error && (
        <p id={errorId} className="text-xs leading-4 text-destructive">
          {error}
        </p>
      )}
    </div>
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

/**
 * Tách đôi `buildAdminStats` cũ.
 *
 * Bản cũ nhận cả `users` lẫn `plans` nên MỌI tab muốn hiện một con số đều phải có sẵn cả
 * hai mảng — đó chính là thứ buộc khung phải gọi hai truy vấn cho tất cả bảy tab. Tách ra
 * thì tab Tài khoản chỉ cần tài khoản, tab Gói chỉ cần gói, và trình biên dịch giữ cho
 * điều đó luôn đúng.  #Huynh
 */
function buildUserStats(users: AdminUser[]) {
  return {
    totalUsers: users.length,
    activeUsers: users.filter((user) => user.status === "active").length,
    suspendedUsers: users.filter((user) => user.status === "suspended").length,
    adminUsers: users.filter((user) => user.role === "admin").length,
    freelancerUsers: users.filter((user) => user.role === "freelancer").length,
  };
}

function buildPlanStats(plans: AdminPlan[]) {
  return {
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

// ---------------------------------------------------------------------------
// Thư viện mẫu điều khoản theo nghề (Phiếu SU26SE083, Gói 6)
// ---------------------------------------------------------------------------

const TEMPLATE_TYPE_LABEL: Record<AdminTemplateType, string> = {
  proposal: "Báo giá",
  contract: "Hợp đồng",
};

/** Nhãn nghề tra từ PROFESSIONS (dùng chung với hồ sơ freelancer). null = mẫu dùng chung. */
function professionLabel(slug: string | null): string {
  if (!slug) return "Dùng chung";
  return PROFESSIONS.find((p) => p.value === slug)?.label ?? slug;
}

export function AdminTemplatesPage() {
  const [typeFilter, setTypeFilter] = useState<AdminTemplateType | "">("");
  const [professionFilter, setProfessionFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);

  const filter = {
    ...(typeFilter ? { template_type: typeFilter } : {}),
    ...(professionFilter ? { profession: professionFilter } : {}),
  };
  const templatesQuery = useAdminTemplates(filter);
  const createTemplate = useCreateAdminTemplate();
  const templates = templatesQuery.data ?? [];

  const activeCount = templates.filter((t) => t.is_active).length;
  const byProfession = new Set(templates.map((t) => t.profession).filter(Boolean)).size;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard compact icon={FileText} label="Tổng mẫu" value={String(templates.length)} hint="Theo bộ lọc hiện tại" tone="primary" />
        <MetricCard compact icon={CheckCircle2} label="Đang bật" value={String(activeCount)} hint="Mẫu đang dùng được" tone="success" />
        <MetricCard compact icon={Users} label="Nghề có mẫu riêng" value={String(byProfession)} hint="Chưa tính mẫu dùng chung" tone="default" />
      </div>

      <PanelShell
        title="Thư viện mẫu điều khoản"
        icon={FileText}
        action={
          <Button type="button" size="sm" onClick={() => setShowCreate((c) => !c)}>
            {showCreate ? <X className="size-4" /> : <Plus className="size-4" />}
            {showCreate ? "Đóng form" : "Tạo mẫu"}
          </Button>
        }
      >
        {/* Bộ lọc theo loại + nghề — đúng cách admin duyệt thư viện "theo nhóm nghề". */}
        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AdminTemplateType | "")}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Tất cả loại</option>
            <option value="proposal">Báo giá</option>
            <option value="contract">Hợp đồng</option>
          </select>
          <select
            value={professionFilter}
            onChange={(e) => setProfessionFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Tất cả nghề</option>
            {PROFESSIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {showCreate && (
          <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <TemplateForm
              submitLabel="Tạo mẫu mới"
              isSubmitting={createTemplate.isPending}
              onCancel={() => setShowCreate(false)}
              onSubmit={(payload) =>
                createTemplate.mutate(payload, { onSuccess: () => setShowCreate(false) })
              }
            />
          </div>
        )}

        {templatesQuery.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Đang tải thư viện mẫu...
          </div>
        ) : templates.length === 0 ? (
          <EmptyState text="Chưa có mẫu nào khớp bộ lọc. Bấm “Tạo mẫu” để thêm." />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </PanelShell>
    </div>
  );
}

function TemplateCard({ template }: { template: AdminTemplate }) {
  const updateTemplate = useUpdateAdminTemplate();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <article className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <TemplateForm
          template={template}
          submitLabel="Lưu mẫu"
          isSubmitting={updateTemplate.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={(payload) =>
            updateTemplate.mutate(
              { id: template.id, payload },
              { onSuccess: () => setEditing(false) }
            )
          }
        />
      </article>
    );
  }

  const body = typeof template.content?.body === "string" ? template.content.body : "";

  return (
    <article className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold">{template.name}</h3>
            <PlanStatePill active={template.is_active} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold text-muted-foreground">
              {TEMPLATE_TYPE_LABEL[template.template_type]}
            </span>
            <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-medium text-primary">
              {professionLabel(template.profession)}
            </span>
            <span className="text-muted-foreground">v{template.version_number}</span>
          </div>
          {body && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{body}</p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="size-4" /> Sửa
        </Button>
      </div>
    </article>
  );
}

type TemplateDraft = {
  name: string;
  template_type: AdminTemplateType;
  profession: string;
  body: string;
  is_active: boolean;
};

function TemplateForm({
  template,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  template?: AdminTemplate;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (payload: {
    name: string;
    template_type: AdminTemplateType;
    profession: string | null;
    content: Record<string, unknown>;
    is_active: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<TemplateDraft>(() => ({
    name: template?.name ?? "",
    template_type: template?.template_type ?? "proposal",
    profession: template?.profession ?? "",
    body: typeof template?.content?.body === "string" ? template.content.body : "",
    is_active: template?.is_active ?? false,
  }));

  const canSubmit = draft.name.trim().length > 0 && draft.body.trim().length > 0;

  function set(field: keyof TemplateDraft, value: string | boolean) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      name: draft.name.trim(),
      template_type: draft.template_type,
      // "" = mẫu dùng chung → gửi null cho backend lưu NULL.
      profession: draft.profession || null,
      content: { body: draft.body.trim() },
      is_active: draft.is_active,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Tên mẫu</span>
          <input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="VD: Điều khoản thanh toán chuẩn"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Loại</span>
          <select
            value={draft.template_type}
            onChange={(e) => set("template_type", e.target.value as AdminTemplateType)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="proposal">Báo giá</option>
            <option value="contract">Hợp đồng</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Áp dụng cho nghề</span>
        <select
          value={draft.profession}
          onChange={(e) => set("profession", e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Dùng chung cho mọi nghề</option>
          {PROFESSIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Nội dung điều khoản</span>
        <textarea
          value={draft.body}
          onChange={(e) => set("body", e.target.value)}
          rows={6}
          placeholder="Nội dung mẫu điều khoản (tiếng Việt)..."
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.is_active}
          onChange={(e) => set("is_active", e.target.checked)}
          className="size-4 rounded border-input"
        />
        Bật mẫu này (cho phép dùng)
      </label>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="sm" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Hủy
        </Button>
      </div>
    </form>
  );
}

/**
 * Trang cho phép Admin đổi AI provider và model.
 */
export function AdminAiConfigPage() {
  const AI_PROVIDER_OPTIONS: {
    value: LLMProvider;
    label: string;
    description: string;
  }[] = [
    {
      value: "groq",
      label: "Groq",
      description: "Cloud inference",
    },
    {
      value: "gemini",
      label: "Gemini",
      description: "Google AI",
    },
    {
      value: "ollama",
      label: "Ollama",
      description: "Local inference",
    },
  ];

  const AI_MODELS_BY_PROVIDER: Record<LLMProvider, string[]> = {
    groq: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
    ],
    gemini: [
      "gemini-2.5-flash",
      "gemini-3.5-flash-lite",
    ],
    ollama: [
      "qwen3:4b",
    ],
  };

  const { data, isLoading, isError, refetch } = useAdminLLMProvider();
  const updateMutation = useUpdateAdminLLMProvider();

  const [selectedProvider, setSelectedProvider] =
    useState<LLMProvider>("groq");

  const [selectedModel, setSelectedModel] = useState(
    "llama-3.3-70b-versatile",
  );

  useEffect(() => {
    if (!data) return;

    setSelectedProvider(data.llm_provider);
    setSelectedModel(data.llm_model);
  }, [data]);

  const availableModels = AI_MODELS_BY_PROVIDER[selectedProvider] ?? [];

  const hasUnsavedChanges =
    !!data &&
    (selectedProvider !== data.llm_provider ||
      selectedModel !== data.llm_model);

  const currentProviderLabel =
    AI_PROVIDER_OPTIONS.find(
      (provider) => provider.value === data?.llm_provider,
    )?.label ?? data?.llm_provider;

  function handleProviderChange(provider: LLMProvider) {
    setSelectedProvider(provider);
    setSelectedModel(AI_MODELS_BY_PROVIDER[provider]?.[0] ?? "");
  }

  function handleSave() {
    updateMutation.mutate({
      llm_provider: selectedProvider,
      llm_model: selectedModel,
    });
  }

  function handleReset() {
    if (!data) return;

    setSelectedProvider(data.llm_provider);
    setSelectedModel(data.llm_model);
  }

  if (isLoading) {
    return (
      <PanelShell title="Cấu hình AI" icon={Settings}>
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Đang tải cấu hình AI...
          </div>
        </div>
      </PanelShell>
    );
  }

  if (isError || !data) {
    return (
      <PanelShell title="Cấu hình AI" icon={Settings}>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-destructive/10 p-2">
              <Settings className="size-4 text-destructive" />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Không thể tải cấu hình AI
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Đã xảy ra lỗi khi tải cấu hình nhà cung cấp và model.
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => refetch()}
              >
                Thử lại
              </Button>
            </div>
          </div>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell title="Cấu hình AI" icon={Settings}>
      <div className="max-w-4xl space-y-6">
        {/* Page description */}
        <div>
          <p className="text-sm text-muted-foreground">
            Quản lý nhà cung cấp và model AI được sử dụng bởi các
            tính năng AI trong hệ thống.
          </p>
        </div>

        {/* Current configuration */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Bot className="size-5 text-primary" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">
                    Cấu hình đang hoạt động
                  </h2>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Đang sử dụng
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  Cấu hình hiện tại của hệ thống
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Nhà cung cấp
              </p>

              <p className="mt-2 text-base font-semibold">
                {currentProviderLabel}
              </p>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {data.llm_provider}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Model
              </p>

              <p className="mt-2 truncate text-base font-semibold">
                {data.llm_model}
              </p>
            </div>
          </div>
        </div>

        {/* Configuration form */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">
              Thay đổi cấu hình
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Chọn nhà cung cấp và model sẽ được sử dụng cho các yêu
              cầu AI mới.
            </p>
          </div>

          <div className="space-y-6 p-5">
            {/* Provider */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold">
                  Nhà cung cấp AI
                </label>

                <p className="mt-1 text-xs text-muted-foreground">
                  Chọn nền tảng cung cấp khả năng suy luận AI.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {AI_PROVIDER_OPTIONS.map((provider) => {
                  const isSelected =
                    selectedProvider === provider.value;

                  return (
                    <button
                      key={provider.value}
                      type="button"
                      onClick={() =>
                        handleProviderChange(provider.value)
                      }
                      className={[
                        "relative rounded-xl border p-4 text-left transition-colors",
                        "hover:bg-muted/40",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-background",
                      ].join(" ")}
                    >
                      {isSelected && (
                        <div className="absolute right-3 top-3">
                          <CheckCircle2 className="size-5 text-primary" />
                        </div>
                      )}

                      <div
                        className={[
                          "mb-3 flex size-9 items-center justify-center rounded-lg text-sm font-bold",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {provider.label.charAt(0)}
                      </div>

                      <p className="text-sm font-semibold">
                        {provider.label}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {provider.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model */}
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="ai-model"
                  className="text-sm font-semibold"
                >
                  Model
                </label>

                <p className="mt-1 text-xs text-muted-foreground">
                  Chọn model thuộc nhà cung cấp đã chọn.
                </p>
              </div>

              {availableModels.length > 0 ? (
                <select
                  id="ai-model"
                  value={selectedModel}
                  onChange={(event) =>
                    setSelectedModel(event.target.value)
                  }
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">
                    Chưa có model được cấu hình cho nhà cung cấp này.
                  </p>
                </div>
              )}
            </div>

            {/* Unsaved changes */}
            {hasUnsavedChanges && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-amber-500/10 p-1.5">
                    <Settings className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      Có thay đổi chưa lưu
                    </p>

                    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">
                          Nhà cung cấp:
                        </span>{" "}
                        <span className="font-medium">
                          {selectedProvider}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground">
                          Model:
                        </span>{" "}
                        <span className="font-medium">
                          {selectedModel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Thay đổi sẽ áp dụng cho các yêu cầu AI mới.
            </p>

            <div className="flex justify-end gap-2">
              {hasUnsavedChanges && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={updateMutation.isPending}
                >
                  Hủy thay đổi
                </Button>
              )}

              <Button
                type="button"
                onClick={handleSave}
                disabled={
                  updateMutation.isPending ||
                  availableModels.length === 0 ||
                  !hasUnsavedChanges
                }
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Lưu cấu hình
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
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
export function AdminAiCostsPage() {
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
            <div className="hidden grid-cols-[130px_minmax(0,1fr)_minmax(0,1fr)_80px_80px_100px_130px] gap-3 border-b border-border bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
              <div>Tính năng</div>
              <div>Người dùng</div>
              <div>Model</div>
              <div className="text-right">Token vào</div>
              <div className="text-right">Token ra</div>
              <div className="text-right">Ước tính</div>
              <div className="text-right">Thời điểm</div>
            </div>
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div key={row.id} className="grid gap-1 px-4 py-2 text-sm lg:grid-cols-[130px_minmax(0,1fr)_minmax(0,1fr)_80px_80px_100px_130px] lg:items-center">
                  <div className="font-medium">{AI_MODULE_LABEL[row.ai_module] ?? row.ai_module}</div>
                  <div className="min-w-0 truncate" title={row.user_email ?? row.user_full_name ?? undefined}>
                    {row.user_email ?? row.user_full_name ?? "—"}
                  </div>
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
export function AdminAuditPage() {
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
                  <span
                    className="max-w-[220px] truncate font-medium text-foreground"
                    title={log.actor_email ?? log.actor_full_name ?? "Hệ thống"}
                  >
                    {log.actor_email ?? log.actor_full_name ?? "Hệ thống"}
                  </span>
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
