/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { toast } from "sonner";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Code2,
  Megaphone,
  Palette,
  PenLine,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import { useFreelancers } from "@/features/freelancers/hooks/useFreelancers";
import type { Freelancer } from "@/features/freelancers/types";

export const Route = createFileRoute("/find-freelancer")({
  component: FindFreelancerPage,
});

// ─── Types ─────────────────────────────────────────────────────────────────────

type Step = "skills" | "list";

// ─── Data: Categories (top-level only) ────────────────────────────────────────

const CATEGORIES = [
  {
    id: "design",
    label: "Thiết kế",
    desc: "UI/UX, Logo, Đồ họa, Video",
    Icon: Palette,
    iconColor: "text-violet-500",
    iconBg: "bg-violet-500/10",
    selectedBg: "bg-violet-500/10",
    selectedBorder: "border-violet-500",
  },
  {
    id: "dev",
    label: "Lập trình",
    desc: "Web, Mobile, Backend, AI",
    Icon: Code2,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    selectedBg: "bg-blue-500/10",
    selectedBorder: "border-blue-500",
  },
  {
    id: "marketing",
    label: "Marketing",
    desc: "SEO, Ads, Social Media",
    Icon: Megaphone,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10",
    selectedBg: "bg-orange-500/10",
    selectedBorder: "border-orange-500",
  },
  {
    id: "content",
    label: "Nội dung",
    desc: "Copywriting, Blog, Kịch bản",
    Icon: PenLine,
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
    selectedBg: "bg-green-500/10",
    selectedBorder: "border-green-500",
  },
  {
    id: "consulting",
    label: "Tư vấn",
    desc: "Kinh doanh, Tài chính, Pháp lý",
    Icon: TrendingUp,
    iconColor: "text-teal-500",
    iconBg: "bg-teal-500/10",
    selectedBg: "bg-teal-500/10",
    selectedBorder: "border-teal-500",
  },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
);

// ─── Data: Mock Freelancers ────────────────────────────────────────────────────

// ─── Page root ─────────────────────────────────────────────────────────────────

function FindFreelancerPage() {
  const [step, setStep] = useState<Step>("skills");
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <FindNavbar />
      {step === "skills" ? (
        <CategorySelectStep
          selected={selected}
          onToggle={toggle}
          onNext={() => setStep("list")}
          onSkip={() => setStep("list")}
        />
      ) : (
        <FreelancerListStep
          selected={selected}
          onBack={() => setStep("skills")}
          onToggle={toggle}
        />
      )}
    </div>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────────

function FindNavbar() {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/home" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight">SoloDesk</span>
        </Link>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 transition-all duration-200"
        >
          Bắt đầu miễn phí
        </Link>
      </div>
    </header>
  );
}

// ─── Step 1: Category selection ────────────────────────────────────────────────

function CategorySelectStep({
  selected,
  onToggle,
  onNext,
  onSkip,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
      <Link
        to="/home"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại trang chủ
      </Link>

      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-sm text-primary font-medium mb-5">
          <Users className="h-3.5 w-3.5" />
          Tìm Freelancer phù hợp
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Bạn cần dịch vụ nào?
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Chọn một hoặc nhiều lĩnh vực bạn đang tìm kiếm.
        </p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
        {CATEGORIES.map((cat) => {
          const isOn = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onToggle(cat.id)}
              className={cn(
                "relative flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition-all duration-150",
                isOn
                  ? cn("border-primary bg-primary/5 shadow-sm", "scale-[1.02]")
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02]",
              )}
            >
              {isOn && (
                <span className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                </span>
              )}
              <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", cat.iconBg)}>
                <cat.Icon className={cn("h-5 w-5", cat.iconColor)} />
              </div>
              <div>
                <p className="font-semibold text-sm">{cat.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{cat.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Bỏ qua, xem tất cả
        </button>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200",
            selected.length > 0
              ? "bg-primary text-primary-foreground hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          Tìm Freelancer
          {selected.length > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
              {selected.length}
            </span>
          )}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </main>
  );
}

// ─── Step 2: Freelancer list ───────────────────────────────────────────────────

function FreelancerListStep({
  selected,
  onBack,
  onToggle,
}: {
  selected: string[];
  onBack: () => void;
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const { data, isError, isFetching, isPending, refetch } = useFreelancers({
    categoryIds: selected,
    search: query,
  });
  const freelancers = data?.items ?? [];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          Thay đổi lĩnh vực
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên, mô tả..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-muted-foreground">Lĩnh vực:</span>
        {CATEGORIES.map((cat) => {
          const active = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => onToggle(cat.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              {CATEGORY_LABEL[cat.id]}
              {active && <X className="h-3 w-3" />}
            </button>
          );
        })}
      </div>

      <div className="mb-6 flex min-h-5 items-center gap-2 text-sm text-muted-foreground">
        {!isPending && (
          <>
            <span>
              <span className="font-semibold text-foreground">{data?.total ?? 0}</span>{" "}
              freelancer{selected.length > 0 ? " phù hợp" : ""}
            </span>
            {isFetching && <span className="text-xs">Đang cập nhật...</span>}
          </>
        )}
      </div>

      {isPending ? (
        <FreelancerListSkeleton />
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <p className="font-semibold">Không thể tải danh sách freelancer</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Đã có lỗi khi gọi mock API. Vui lòng thử lại.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Thử lại
          </button>
        </div>
      ) : freelancers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {freelancers.map((f, i) => (
            <RevealOnScroll key={f.id} delay={i * 60}>
              <FreelancerCard freelancer={f} selected={selected} />
            </RevealOnScroll>
          ))}
        </div>
      ) : (
        <div className="text-center py-24">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-semibold mb-2">Không tìm thấy freelancer</p>
          <p className="text-sm text-muted-foreground mb-6">
            Thử điều chỉnh lĩnh vực hoặc từ khoá tìm kiếm.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Thay đổi lĩnh vực
          </button>
        </div>
      )}
    </main>
  );
}

// ─── Freelancer card ───────────────────────────────────────────────────────────

function FreelancerListSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-label="Đang tải danh sách freelancer"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex gap-3">
            <div className="h-12 w-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-11/12 rounded bg-muted" />
            <div className="h-3 w-4/5 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FreelancerCard({
  freelancer: f,
  selected,
}: {
  freelancer: Freelancer;
  selected: string[];
}) {
  const badgeClass =
    f.badge === "Top Rated"
      ? "bg-success/10 text-success border-success/25"
      : f.badge === "Nổi bật"
        ? "bg-warm/10 text-warm border-warm/25"
        : "bg-primary/10 text-primary border-primary/25";

  return (
    <article className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-black/[0.06]">
      <div className="flex items-start gap-3">
        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0", f.avatarBg)}>
          {f.initials}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm truncate leading-snug">{f.name}</p>
            {f.verified && <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
          </div>
          <p className="mt-0.5 line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
            {f.title}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
        {f.bio}
      </p>

      {/* Category tags */}
      <div className="flex flex-wrap gap-1.5">
        {f.badge && (
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              badgeClass,
            )}
          >
            {f.badge}
          </span>
        )}
        {f.categoryIds.map((id) => (
          <span
            key={id}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              selected.includes(id)
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted/50 text-muted-foreground border-border",
            )}
          >
            {CATEGORY_LABEL[id]}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">{f.rating}</span>
            <span>({f.reviews})</span>
          </span>
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {f.projects}
          </span>
        </div>
        <button
          onClick={() => toast.info("Tính năng xem hồ sơ đang được phát triển.")}
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline transition-colors"
        >
          Xem hồ sơ
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
