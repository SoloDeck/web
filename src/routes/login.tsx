import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  FileText,
  LayoutGrid,
  Sparkles,
  Users,
} from "lucide-react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage,
});

// ── Page root ─────────────────────────────────────────────────────────────────

function LoginPage() {
  return (
    <div className="min-h-screen flex bg-background">
      <HeroPanel />

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-10 lg:px-14 py-12 overflow-y-auto">
        {/* Mobile logo — hidden on desktop where HeroPanel shows */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg leading-none tracking-tight">SoloDesk</div>
            <div className="text-[11px] text-muted-foreground">Trợ lý của Freelancer Việt</div>
          </div>
        </div>

        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight">
              Đăng nhập vào SoloDesk
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Tiếp tục quản lý khách hàng và công việc của bạn.
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/[0.06] sm:p-7">
            <LoginForm />
          </div>

          {/* Footer */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:underline"
            >
              Tạo tài khoản miễn phí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Hero panel (left, desktop only) ──────────────────────────────────────────

const FEATURES = [
  {
    Icon: Users,
    title: "Đánh giá khách hàng tiềm năng bằng AI",
  },
  {
    Icon: FileText,
    title: "Tạo đề xuất & hợp đồng tiếng Việt",
  },
  {
    Icon: Bell,
    title: "Theo dõi thanh toán và lịch chăm sóc khách hàng",
  },
];

const KANBAN_COLS = [
  {
    label: "Tiềm năng",
    dotClass: "bg-cold",
    borderClass: "border-cold/25",
    bgClass: "bg-cold/10",
    cards: ["Thiết kế web 3 trang", "App mobile iOS"],
  },
  {
    label: "Đàm phán",
    dotClass: "bg-warning",
    borderClass: "border-warning/25",
    bgClass: "bg-warning/10",
    cards: ["Hệ thống CRM nội bộ"],
  },
  {
    label: "Chốt hợp đồng",
    dotClass: "bg-success",
    borderClass: "border-success/25",
    bgClass: "bg-success/10",
    cards: ["Dashboard phân tích", "API tích hợp"],
  },
];

function HeroPanel() {
  return (
    <div className="hidden lg:flex lg:w-[54%] xl:w-[56%] relative bg-sidebar overflow-hidden">
      {/* Aurora blobs */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden
      >
        <div
          className="absolute rounded-full blur-[140px] opacity-[0.22] animate-[aurora-1_14s_ease-in-out_infinite]"
          style={{
            width: 600,
            height: 600,
            background: "var(--sidebar-primary)",
            top: -220,
            left: -160,
          }}
        />
        <div
          className="absolute rounded-full blur-[110px] opacity-[0.12] animate-[aurora-2_19s_ease-in-out_infinite]"
          style={{
            width: 480,
            height: 480,
            background: "oklch(0.65 0.15 220)",
            bottom: -80,
            right: -80,
          }}
        />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.97 0 0 / 0.055) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Content */}
      <div className="relative flex h-full w-full flex-col gap-8 p-10 xl:p-14">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-xl leading-none tracking-tight text-sidebar-foreground">
              SoloDesk
            </div>
            <div className="text-[11px] text-sidebar-foreground/40">
              Trợ lý của Freelancer Việt
            </div>
          </div>
        </div>

        {/* Main copy */}
        <div className="flex flex-1 flex-col justify-center space-y-7">
          <div className="space-y-4">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sidebar-primary/30 bg-sidebar-primary/10 px-3 py-1 text-xs font-medium text-sidebar-primary">
              <Sparkles className="h-3 w-3" />
              Dành riêng cho Freelancer Việt Nam
            </div>

            {/* Headline */}
            <h2 className="text-2xl font-bold leading-snug text-sidebar-foreground xl:text-[1.75rem]">
              Quản lý khách hàng, hợp đồng và thanh toán{" "}
              <span className="bg-gradient-to-r from-sidebar-primary to-primary-glow bg-clip-text text-transparent">
                thông minh hơn
              </span>
            </h2>

            {/* Description */}
            <p className="max-w-sm text-sm leading-relaxed text-sidebar-foreground/55">
              Nền tảng hỗ trợ freelancer Việt quản lý khách hàng, theo dõi cơ
              hội, tạo đề xuất dịch vụ và nhắc thanh toán bằng AI.
            </p>
          </div>

          {/* Feature checklist */}
          <div className="space-y-2.5">
            {FEATURES.map(({ Icon, title }) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-xl border border-sidebar-border/50 bg-sidebar-accent/30 px-4 py-3 backdrop-blur-sm transition-colors hover:bg-sidebar-accent/50"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/15">
                  <Icon className="h-4 w-4 text-sidebar-primary" />
                </div>
                <span className="flex-1 text-sm font-medium text-sidebar-foreground/85">
                  {title}
                </span>
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
              </div>
            ))}
          </div>
        </div>

        {/* Mini Kanban preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5 text-sidebar-foreground/35" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">
              Pipeline thực tế
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {KANBAN_COLS.map((col) => (
              <div
                key={col.label}
                className={`rounded-xl border ${col.borderClass} ${col.bgClass} space-y-2 p-3 backdrop-blur-sm`}
              >
                {/* Column header */}
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${col.dotClass}`}
                  />
                  <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/60">
                    {col.label}
                  </span>
                </div>

                {/* Cards */}
                {col.cards.map((card) => (
                  <div
                    key={card}
                    className="rounded-lg border border-sidebar-border/25 bg-sidebar/50 px-2.5 py-2 text-[11px] leading-snug text-sidebar-foreground/70"
                  >
                    {card}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
