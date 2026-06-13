import { Briefcase, LayoutDashboard, MessageSquareHeart, Plus, Settings, Wallet, X } from "lucide-react";
import type { Deal } from "@/features/deals/types";
import { UserMenu } from "@/features/auth/components/UserMenu";

type NavKey = "pipeline" | "clients" | "revenue" | "settings";

export function AppSidebar({
  deals,
  onNewDeal,
  open,
  onClose,
  active,
  onNavigate,
}: {
  deals: Deal[];
  onNewDeal: () => void;
  open: boolean;
  onClose: () => void;
  active: NavKey;
  onNavigate: (nav: NavKey) => void;
}) {
return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-72 shrink-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary-glow grid place-items-center shadow-lg shrink-0">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="font-bold tracking-tight text-base truncate">SoloDesk</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">Trợ lý của Freelancer Việt</div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition"
            title="Đóng menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>


      <nav className="p-3 space-y-1">
        {[
          { key: "pipeline" as const, icon: LayoutDashboard, label: "Dự án" },
          { key: "clients" as const, icon: MessageSquareHeart, label: "Hồ sơ khách hàng" },
          { key: "revenue" as const, icon: Wallet, label: "Thanh toán & Hợp đồng" },
          { key: "settings" as const, icon: Settings, label: "Cài đặt hồ sơ" },
        ].map((it) => (
          <button
            key={it.key}
            onClick={() => onNavigate(it.key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              active === it.key
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60"
            }`}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </button>
        ))}
      </nav>

      <div className="px-4 mt-2">
        <button
          onClick={onNewDeal}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95 transition"
        >
          <Plus className="h-4 w-4" />
          Thêm dự án mới
        </button>
      </div>


<div className="mt-auto p-4 border-t border-sidebar-border space-y-3">
        <UserMenu onOpenSettings={() => onNavigate("settings")} />
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md bg-sidebar-accent px-2 py-1.5">
            <div className="text-sidebar-foreground/60">Zalo</div>
            <div className="font-semibold text-success">Đã kết nối</div>
          </div>
          <div className="rounded-md bg-sidebar-accent px-2 py-1.5">
            <div className="text-sidebar-foreground/60">Email</div>
            <div className="font-semibold text-success">Đã kết nối</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
