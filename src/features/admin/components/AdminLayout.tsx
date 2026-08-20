import { useState, type ComponentType } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CreditCard,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Receipt,
  RefreshCw,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { adminKeys } from "@/features/admin/hooks/useAdmin";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
};

/**
 * Tám tab của khu quản trị.
 *
 * Không còn trường `page` như bản cũ: danh tính của một tab bây giờ CHÍNH LÀ `path` của
 * nó. Trước đây `page` phải khớp tay với `path` ở hai nơi, và chỉ cần lệch một chữ là mục
 * đang xem không sáng lên mà chẳng có lỗi nào báo.  #Huynh
 */
const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: "Tổng quan",
    path: "/admin",
    icon: LayoutDashboard,
    description: "Tổng quan vận hành SoloDesk",
  },
  {
    label: "Tài khoản",
    path: "/admin/users",
    icon: Users,
    description: "Quản lý người dùng và trạng thái truy cập",
  },
  {
    label: "Gói dịch vụ",
    path: "/admin/plans",
    icon: CreditCard,
    description: "Danh mục gói và giới hạn sử dụng",
  },
  {
    label: "Giao dịch thanh toán",
    path: "/admin/payment-transactions",
    icon: Receipt,
    description: "Ai mua gói nào, lúc nào, bao nhiêu tiền",
  },
  {
    label: "Thư viện mẫu",
    path: "/admin/templates",
    icon: FileText,
    description: "Điều khoản và khung soạn sẵn cho báo giá / hợp đồng",
  },
  {
    label: "Cấu hình AI",
    path: "/admin/ai-config",
    icon: Settings,
    description: "Chọn AI provider và model đang được hệ thống sử dụng",
  },
  {
    label: "Chi phí AI",
    path: "/admin/ai-costs",
    icon: Bot,
    description: "Token và chi phí ước tính mỗi lần gọi AI",
  },
  {
    label: "Nhật ký",
    path: "/admin/audit",
    icon: ScrollText,
    description: "Ai làm gì, cho ai, lúc nào",
  },
];

/**
 * Mục nav ứng với đường dẫn đang xem.
 *
 * So KHỚP HẲN chứ không `startsWith`: `/admin` là tab Tổng quan, mà `startsWith` thì nó
 * nuốt luôn `/admin/users`, `/admin/audit`… và cả bảy mục cùng sáng một lúc.  #Huynh
 */
function findActiveNavItem(pathname: string): AdminNavItem {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return ADMIN_NAV_ITEMS.find((item) => item.path === normalized) ?? ADMIN_NAV_ITEMS[0];
}

/**
 * Khung khu quản trị: thanh bên + thanh tiêu đề, nội dung từng tab đi vào `<Outlet />`.
 *
 * Khung KHÔNG gọi truy vấn nào. Bản cũ gọi sẵn `useAdminUsers()` + `useAdminPlans()` rồi
 * lấy `isLoading` của hai truy vấn đó thay TOÀN BỘ vùng nội dung — nên Nhật ký, Chi phí
 * AI, Thư viện mẫu và Cấu hình AI đều bị hai truy vấn chúng không hề dùng chặn ngang mặt.
 * Giờ mỗi tab tự lo dữ liệu và màn chờ của chính nó.  #Huynh
 */
export function AdminLayout() {
  const currentUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeItem = findActiveNavItem(pathname);

  // Đếm truy vấn admin đang bay mà không cần biết là truy vấn nào. Nhờ vậy khung nói đúng
  // "đang đồng bộ" cho cả bảy tab — kể cả hai tab mà nó không hề biết mặt dữ liệu.
  const fetchingCount = useIsFetching({ queryKey: adminKeys.all });

  function refresh() {
    // `invalidateQueries` chỉ nạp lại truy vấn ĐANG được component nào đó dùng, nên nút này
    // luôn làm mới đúng tab đang xem mà không đánh thức sáu tab kia.
    queryClient.invalidateQueries({ queryKey: adminKeys.all });
  }

  async function handleLogout() {
    await logout();
    window.location.assign("/login");
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-foreground">
      {/* Lớp phủ là chỗ CHẠM để đóng, không phải một điều khiển thứ hai.
          Bản cũ dựng nó bằng `<button aria-label="Đóng menu quản trị">` — trùng y hệt tên
          của nút X trong thanh bên, nên trình đọc màn hình đọc ra hai nút giống nhau và
          người dùng bàn phím phải Tab qua một chốt thừa làm đúng việc mà nút X đã làm.
          Để `aria-hidden` và không cho focus: người dùng bàn phím đóng bằng nút X.  #Huynh */}
      {mobileNavOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <AdminSidebar
        activePath={activeItem.path}
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
                <h1 className="truncate text-base font-bold sm:text-lg">{activeItem.label}</h1>
                <p className="hidden truncate text-xs text-muted-foreground md:block">
                  {activeItem.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SystemStatusPill isFetching={fetchingCount > 0} />
              <Button type="button" variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className={cn("size-4", fetchingCount > 0 && "animate-spin")} />
                <span className="hidden sm:inline">Làm mới</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1540px] space-y-5 px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminSidebar({
  activePath,
  currentEmail,
  open,
  onClose,
  onLogout,
}: {
  activePath: string;
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
              <AdminNavLink
                key={item.path}
                item={item}
                active={activePath === item.path}
                onNavigate={onClose}
              />
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
  onNavigate,
}: {
  item: AdminNavItem;
  active: boolean;
  /** Đóng menu mobile sau khi chọn — xem ghi chú bên dưới. */
  onNavigate: () => void;
}) {
  return (
    /* `Link` của router, KHÔNG phải `<a href>` trần.
     *
     * Anchor trần giao việc điều hướng cho trình duyệt: nó tải lại cả tài liệu, dựng React
     * từ số 0, gọi lại mọi truy vấn — bấm tab mà y hệt bấm F5. `Link` chặn sự kiện rồi đổi
     * URL ngay trong ứng dụng, giữ nguyên khung và toàn bộ state của nó.
     *
     * Nó cũng là thứ DUY NHẤT kích hoạt được `defaultPreload: "intent"` khai ở `router.tsx`:
     * rê chuột lên link là router tải trước mã của đích. Với `<a href>` thì tuỳ chọn đó vô
     * hiệu hoàn toàn, tức công sức tách mã theo route bị mất trắng ở khu này.  #Huynh
     */
    <Link
      to={item.path}
      /* Đóng menu ngay khi chọn tab. Trước đây việc này xảy ra MIỄN PHÍ vì bấm tab là tải
         lại cả trang, `mobileNavOpen` sinh ra lại từ `false`. Giờ khung không rời DOM nữa
         nên state cũng không tự về — thiếu dòng này thì trên điện thoại bấm tab xong là
         ngồi nhìn cái drawer che kín màn hình. */
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        active
          ? "bg-white text-[#101828] shadow-sm"
          : "text-white/72 hover:bg-white/10 hover:text-white",
      )}
    >
      <item.icon className="size-4" />
      <div className="min-w-0 truncate font-semibold">{item.label}</div>
    </Link>
  );
}

function SystemStatusPill({ isFetching }: { isFetching: boolean }) {
  if (isFetching) {
    return (
      <span className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:inline-flex">
        <Loader2 className="size-3 animate-spin" />
        Đang đồng bộ
      </span>
    );
  }

  /* Bỏ nhánh "Mất kết nối" của bản cũ. Nó chỉ biết về hai truy vấn users/plans, nên khi
     bạn đang ở tab Nhật ký chạy hoàn hảo mà users lỗi thì nó vẫn bôi đỏ "Mất kết nối" —
     báo sai chỗ. Giờ mỗi tab tự vẽ `AdminErrorState` kèm nút "Thử lại": nói đúng cái đang
     hỏng, và bấm được.  #Huynh */
  return (
    <span className="hidden items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success sm:inline-flex">
      <span className="size-2 rounded-full bg-current" />
      Hệ thống sẵn sàng
    </span>
  );
}
