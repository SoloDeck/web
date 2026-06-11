import { Briefcase, LayoutDashboard, MessageSquareHeart, Settings, Sparkles, TrendingUp, Wallet, X } from "lucide-react";
import { formatVND } from "@/utils/format";
import type { Deal } from "@/features/deals/types";
import { UserMenu } from "@/features/auth/components/UserMenu";

type NavKey = "pipeline" | "clients" | "revenue" | "settings";

export function AppSidebar({ 
  deals, 
  onOpenAI,
  open,
  onClose,
  active,
  onNavigate,
}: { 
  deals: Deal[]; 
  onOpenAI: () => void;
  open: boolean;
  onClose: () => void;
  active: NavKey;
  onNavigate: (nav: NavKey) => void;
}) {
  const billed = deals.filter((d) => d.stage === "completed").reduce((s, d) => s + d.value, 0);
  const won = deals.filter((d) => d.stage === "completed").length;
  const lost = 2;
  const winRate = Math.round((won / (won + lost)) * 100);
  const pipeline = deals.filter((d) => !["completed"].includes(d.stage)).reduce((s, d) => s + d.value, 0);

  return (
    <aside 
      className={`
        fixed inset-y-0 left-0 z-40 w-72 shrink-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out
        lg:static lg:h-screen lg:top-0
        ${open ? "translate-x-0 opacity-100" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:border-r-0 overflow-hidden"}
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
          onClick={onOpenAI}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-glow px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95 transition"
        >
          <Sparkles className="h-4 w-4" />
          Tác vụ Nhanh AI
        </button>
      </div>

      <div className="p-4 mt-4">
        <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50 mb-2 flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3" /> Doanh thu tháng này
        </div>
        <div className="rounded-xl bg-gradient-to-br from-sidebar-accent to-sidebar-accent/40 border border-sidebar-border p-4">
          <div className="text-2xl font-bold tracking-tight">{formatVND(billed)}</div>
          <div className="text-xs text-sidebar-foreground/60 mt-0.5">Đã xuất hoá đơn</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-sidebar-foreground/60">Tỉ lệ thắng</div>
              <div className="font-semibold text-success">{winRate}%</div>
            </div>
            <div>
              <div className="text-sidebar-foreground/60">Tổng dự kiến</div>
              <div className="font-semibold">{formatVND(pipeline)}</div>
            </div>
          </div>
        </div>
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
