import { Briefcase, LayoutDashboard, MessageSquare, Settings, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { formatVND, type Deal } from "@/lib/mock-data";

export function AppSidebar({ deals, onOpenAI }: { deals: Deal[]; onOpenAI: () => void }) {
  const billed = deals.filter((d) => d.stage === "completed").reduce((s, d) => s + d.value, 0);
  const won = deals.filter((d) => d.stage === "completed").length;
  const lost = 2;
  const winRate = Math.round((won / (won + lost)) * 100);
  const pipeline = deals.filter((d) => !["completed"].includes(d.stage)).reduce((s, d) => s + d.value, 0);

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary-glow grid place-items-center shadow-lg">
            <Briefcase className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-base">SoloDesk</div>
            <div className="text-[11px] text-sidebar-foreground/60">Trợ lý của Freelancer Việt</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-glow to-primary grid place-items-center font-semibold">
            MN
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">Minh Nguyễn</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">Brand & Content Designer</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md bg-sidebar-accent px-2 py-1.5">
            <div className="text-sidebar-foreground/60">Giá / giờ</div>
            <div className="font-semibold">350.000 ₫</div>
          </div>
          <div className="rounded-md bg-sidebar-accent px-2 py-1.5">
            <div className="text-sidebar-foreground/60">Zalo OA</div>
            <div className="font-semibold text-success">Đã kết nối</div>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        {[
          { icon: LayoutDashboard, label: "Pipeline", active: true },
          { icon: MessageSquare, label: "Tin nhắn khách" },
          { icon: Wallet, label: "Thanh toán & Hợp đồng" },
          { icon: Settings, label: "Cài đặt hồ sơ" },
        ].map((it) => (
          <button
            key={it.label}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              it.active
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
          AI Quick Action
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
              <div className="text-sidebar-foreground/60">Win rate</div>
              <div className="font-semibold text-success">{winRate}%</div>
            </div>
            <div>
              <div className="text-sidebar-foreground/60">Pipeline</div>
              <div className="font-semibold">{formatVND(pipeline)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* <div className="mt-auto p-4 text-[11px] text-sidebar-foreground/40">
        v0.1 MVP · Made in Vietnam 🇻🇳
      </div> */}
    </aside>
  );
}
