import {
  Briefcase,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MessageSquareHeart,
  Plus,
  ShieldCheck,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { useZaloStatus } from "@/features/profile/hooks/useZalo";

type NavKey = "pipeline" | "clients" | "revenue" | "intake-form" | "settings" | "subscription" | "admin";

export function AppSidebar({
  onOpenAI,
  open,
  onClose,
  active,
  onNavigate,
}: {
  onOpenAI: () => void;
  open: boolean;
  onClose: () => void;
  active: NavKey;
  onNavigate: (nav: NavKey) => void;
}) {
  const isAdmin = useAuthStore((state) => state.user?.role === "admin");
  const { data: zaloStatus } = useZaloStatus();
  const zaloConnected = zaloStatus?.connected ?? false;
  const navItems = [
    { key: "pipeline" as const, icon: LayoutDashboard, label: "Quy trình deal" },
    { key: "clients" as const, icon: MessageSquareHeart, label: "Hồ sơ khách hàng" },
    { key: "revenue" as const, icon: Wallet, label: "Thanh toán & Hợp đồng" },
    { key: "intake-form" as const, icon: ClipboardList, label: "Trang công khai" },
    { key: "settings" as const, icon: Settings, label: "Cài đặt hồ sơ" },
    { key: "subscription" as const, icon: CreditCard, label: "Gói dịch vụ" },
    ...(isAdmin ? [{ key: "admin" as const, icon: ShieldCheck, label: "Admin" }] : []),
  ];

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out
        lg:static lg:top-0 lg:h-screen
        ${open ? "translate-x-0 opacity-100" : "-translate-x-full overflow-hidden lg:w-0 lg:translate-x-0 lg:border-r-0 lg:opacity-0"}
      `}
    >
      <div className="border-b border-sidebar-border p-5">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-lg">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-bold tracking-tight">SoloDesk</div>
              <div className="truncate text-[11px] text-sidebar-foreground/60">
                Trợ lý của Freelancer Việt
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            title="Đóng menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="space-y-1 p-3">
        {navItems.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => onNavigate(it.key)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              active === it.key
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
            }`}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </button>
        ))}
      </nav>

      <div className="mt-2 px-4">
        <button
          type="button"
          onClick={onOpenAI}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:opacity-95"
        >
          <Plus className="h-4 w-4" />
          Thêm yêu cầu mới
        </button>
      </div>

      <div className="mt-auto space-y-3 border-t border-sidebar-border p-4">
        <UserMenu onOpenSettings={() => onNavigate("settings")} />
        {/* Trước đây chỗ này là hai ô "Zalo · Đã kết nối" và "Email · Đã kết nối" viết CỨNG —
            xanh lè kể cả khi chưa nối gì. Ô Email bỏ hẳn: backend không có endpoint nào nói
            được email đã "kết nối" hay chưa, mà thư thì gửi qua SMTP của hệ thống chứ không
            phải hộp thư riêng của từng người — nên ô đó không có thật để mà hiển thị.

            Ô Zalo giữ lại vì có dữ liệu thật (GET trạng thái Zalo OA), và cho bấm luôn sang
            trang cài đặt: một cái nhãn nói "chưa kết nối" mà không chỉ đường thì cũng chỉ để
            đó nhìn.  #Huynh */}
        <button
          type="button"
          onClick={() => onNavigate("settings")}
          className="flex w-full items-center justify-between gap-2 rounded-md bg-sidebar-accent px-2 py-1.5 text-left text-[11px] transition hover:brightness-110"
        >
          <span className="text-sidebar-foreground/60">Zalo OA</span>
          <span className={zaloConnected ? "font-semibold text-success" : "text-sidebar-foreground/70"}>
            {zaloConnected ? "Đã kết nối" : "Chưa kết nối"}
          </span>
        </button>
      </div>
    </aside>
  );
}
