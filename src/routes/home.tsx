/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart2,
  Brain,
  Briefcase,
  CheckCircle,
  ClipboardCheck,
  FileText,
  ImageIcon,
  MessageSquare,
  PenLine,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/home")({
  component: HomePage,
});

// ─────────────────────────────────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────────────────────────────────

function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <BenefitsSection />
      <ProcessSection />
      <UserGroupsSection />
      <CTASection />
      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight">SoloDesk</span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            Đăng nhập
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 transition-all duration-200"
          >
            Bắt đầu miễn phí
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative py-24 sm:py-32 px-4 sm:px-6 overflow-hidden">
      {/* Aurora background blobs */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden="true"
      >
        <div
          className="absolute rounded-full blur-[130px] opacity-[0.16] animate-[aurora-1_14s_ease-in-out_infinite]"
          style={{
            width: 700,
            height: 700,
            background: "var(--primary)",
            top: -260,
            left: -160,
          }}
        />
        <div
          className="absolute rounded-full blur-[110px] opacity-[0.11] animate-[aurora-2_19s_ease-in-out_infinite]"
          style={{
            width: 580,
            height: 580,
            background: "var(--primary-glow)",
            top: -200,
            right: -130,
          }}
        />
        <div
          className="absolute rounded-full blur-[150px] opacity-[0.09] animate-[aurora-3_23s_ease-in-out_infinite]"
          style={{
            width: 520,
            height: 520,
            background: "oklch(0.65 0.15 220)",
            bottom: -80,
            left: "38%",
          }}
        />
      </div>

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 hero-dot-grid pointer-events-none select-none"
        aria-hidden="true"
      />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-sm text-primary font-medium mb-8">
          <Brain className="h-3.5 w-3.5" />
          Nền tảng dành riêng cho Freelancer Việt Nam
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-bold tracking-tight leading-[1.1] mb-6">
          Quản lý công việc {" "}
          <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            thông minh hơn
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          SoloDesk giúp freelancer quản lý khách hàng, theo dõi dự án, tạo biểu
          mẫu yêu cầu và đánh giá tiềm năng bằng AI — tất cả trong một nơi duy
          nhất.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 transition-all duration-200 w-full sm:w-auto justify-center"
          >
            Bắt đầu miễn phí <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-secondary hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 transition-all duration-200 w-full sm:w-auto justify-center"
          >
            <Search className="h-4 w-4" />
            Tìm Freelancer
          </a>
        </div>

        {/* Hero image */}
        <RevealOnScroll>
          <div className="relative mx-auto max-w-3xl">
            <div className="absolute -inset-6 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent rounded-3xl blur-2xl pointer-events-none" />
            <HeroDashboardImage />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero dashboard image
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Đặt đường dẫn ảnh screenshot dashboard vào đây.
 *
 * Cách dùng:
 *   1. Để ảnh vào thư mục  web/public/images/  (tạo nếu chưa có)
 *   2. Đặt đường dẫn:       "/images/dashboard-preview.png"
 *
 * Hoặc import trực tiếp từ src/assets/:
 *   import dashboardImg from "@/assets/dashboard-preview.png";
 *   const HERO_IMAGE_SRC = dashboardImg;
 *
 * Để chuỗi rỗng "" → hiển thị placeholder bên dưới.
 */
const HERO_IMAGE_SRC = "";

function HeroDashboardImage() {
  if (HERO_IMAGE_SRC) {
    return (
      <img
        src={HERO_IMAGE_SRC}
        alt="Giao diện SoloDesk Dashboard"
        className="w-full rounded-xl border border-border/70 shadow-2xl shadow-black/10"
      />
    );
  }

  return (
    <div className="w-full rounded-xl border-2 border-dashed border-border bg-card/60 flex flex-col items-center justify-center gap-3 py-16 sm:py-24 text-center px-6">
      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Ảnh minh hoạ dashboard</p>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Điền đường dẫn ảnh vào{" "}
          <code className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">
            HERO_IMAGE_SRC
          </code>{" "}
          trong file này
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────

function StatsSection() {
  return (
    <section className="py-12 px-4 sm:px-6 border-y border-border bg-card">
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-3 gap-4 sm:gap-8 divide-x divide-border">
          {STATS.map((s, i) => (
            <RevealOnScroll key={s.label} delay={i * 100}>
              <div className="text-center px-4">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-1 tabular-nums">
                  {s.value}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground leading-snug">
                  {s.label}
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Benefits
// ─────────────────────────────────────────────────────────────────────────────

function BenefitsSection() {
  return (
    <section className="py-20 sm:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-widest">
              Tính năng nổi bật
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Mọi thứ bạn cần trong một nơi
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              SoloDesk tích hợp các công cụ cần thiết giúp freelancer quản lý
              khách hàng, dự án và công việc chuyên nghiệp hơn.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
          {BENEFITS.map((b, i) => (
            <RevealOnScroll
              key={b.title}
              delay={i * 70}
              className={cn("lg:col-span-2", i === 3 && "lg:col-start-2")}
            >
              <div className="group h-full rounded-2xl border border-border bg-card p-6 flex flex-col gap-4 shadow-sm hover:shadow-lg hover:shadow-black/[0.06] hover:-translate-y-1.5 hover:border-primary/20 transition-all duration-300 cursor-default">
                <div
                  className={cn(
                    "h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    b.iconBg,
                  )}
                >
                  <b.Icon className={cn("h-5 w-5", b.iconColor)} />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <h3 className="font-semibold text-base leading-snug">
                    {b.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Process
// ─────────────────────────────────────────────────────────────────────────────

function ProcessSection() {
  return (
    <section className="py-20 sm:py-24 px-4 sm:px-6 bg-secondary/20">
      <div className="max-w-5xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-widest">
              Quy trình làm việc
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Hoạt động như thế nào?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              Từ yêu cầu đầu tiên đến kết quả cuối cùng, mọi bước đều rõ ràng
              và có hệ thống.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connecting line — desktop only */}
          <div
            className="absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-border to-transparent hidden lg:block pointer-events-none"
            aria-hidden="true"
          />

          {PROCESS_STEPS.map((step, i) => (
            <RevealOnScroll key={step.title} delay={i * 100}>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="relative z-10 h-14 w-14 rounded-full border-2 border-border bg-card flex items-center justify-center shadow-sm flex-shrink-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <step.Icon className="h-4 w-4" />
                  </div>
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1.5">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// User groups
// ─────────────────────────────────────────────────────────────────────────────

function UserGroupsSection() {
  return (
    <section className="py-20 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-widest">
              Dành cho ai?
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
              Hai nhóm người dùng, một nền tảng
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              SoloDesk phục vụ cả freelancer lẫn khách hàng trong cùng một hệ
              sinh thái liền mạch.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Freelancer card */}
          <RevealOnScroll delay={0}>
            <div className="group relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent p-8 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden h-full">
              <div
                className="absolute top-0 right-0 w-40 h-40 bg-primary/8 rounded-full blur-2xl pointer-events-none"
                aria-hidden="true"
              />
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Briefcase className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-2">Freelancer</h3>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  Quản lý toàn bộ quy trình làm việc tự do của bạn một cách
                  chuyên nghiệp và có hệ thống.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {FREELANCER_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 transition-all duration-200"
                >
                  Bắt đầu ngay <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </RevealOnScroll>

          {/* Client card */}
          <RevealOnScroll delay={120}>
            <div className="group relative rounded-2xl border border-border bg-card p-8 hover:border-border/60 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 overflow-hidden h-full">
              <div
                className="absolute top-0 right-0 w-40 h-40 bg-secondary rounded-full blur-2xl pointer-events-none"
                aria-hidden="true"
              />
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-secondary border border-border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="h-6 w-6 text-foreground/70" />
                </div>
                <h3 className="text-xl font-bold mb-2">Khách hàng (Client)</h3>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                  Gửi yêu cầu và theo dõi tiến độ dự án một cách dễ dàng, không
                  cần tạo tài khoản.
                </p>
                <ul className="space-y-2.5 mb-8">
                  {CLIENT_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-secondary hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 transition-all duration-200"
                >
                  Tìm Freelancer <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA
// ─────────────────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-20 sm:py-24 px-4 sm:px-6 bg-secondary/20">
      <RevealOnScroll>
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/4 to-background p-10 sm:p-14 overflow-hidden">
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-primary/15 blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center text-primary mx-auto mb-6">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Sẵn sàng nâng cấp công việc tự do?
              </h2>
              <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed">
                Tham gia cùng hàng nghìn freelancer đang dùng SoloDesk để quản
                lý khách hàng và dự án hiệu quả hơn. Hoàn toàn miễn phí để bắt
                đầu.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 transition-all duration-200"
              >
                Đăng nhập để bắt đầu <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border bg-card py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">SoloDesk</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 SoloDesk. Tất cả quyền được bảo lưu.
        </p>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "500+", label: "Freelancer đang dùng" },
  { value: "2,000+", label: "Dự án đã quản lý" },
  { value: "98%", label: "Tỷ lệ hài lòng" },
];

const BENEFITS = [
  {
    Icon: Users,
    iconBg: "bg-primary/10 group-hover:bg-primary/15",
    iconColor: "text-primary",
    title: "Quản lý khách hàng tập trung",
    desc: "Lưu trữ toàn bộ thông tin khách hàng, lịch sử trao đổi và ghi chú quan trọng trong một nơi.",
  },
  {
    Icon: BarChart2,
    iconBg: "bg-cold/10 group-hover:bg-cold/15",
    iconColor: "text-cold",
    title: "Theo dõi tiến độ dự án",
    desc: "Bảng trực quan giúp bạn nắm rõ trạng thái từng dự án và từng giai đoạn công việc.",
  },
  {
    Icon: FileText,
    iconBg: "bg-success/10 group-hover:bg-success/15",
    iconColor: "text-success",
    title: "Biểu mẫu yêu cầu chuyên nghiệp",
    desc: "Tạo form tùy chỉnh để thu thập yêu cầu từ khách hàng một cách có hệ thống.",
  },
  {
    Icon: Brain,
    iconBg: "bg-primary/10 group-hover:bg-primary/15",
    iconColor: "text-primary",
    title: "AI đánh giá khách hàng",
    desc: "Trợ lý AI phân tích và cho điểm tiềm năng của từng cơ hội kinh doanh.",
  },
  {
    Icon: PenLine,
    iconBg: "bg-warm/10 group-hover:bg-warm/15",
    iconColor: "text-warm",
    title: "Quản lý hợp đồng & doanh thu",
    desc: "Tạo đề xuất và hợp đồng tiếng Việt chuyên nghiệp, theo dõi doanh thu và hiệu suất làm việc theo thời gian.",
  },
];

const PROCESS_STEPS = [
  {
    Icon: MessageSquare,
    title: "Thu thập yêu cầu",
    desc: "Khách hàng điền form yêu cầu do bạn tạo, không cần tạo tài khoản.",
  },
  {
    Icon: Search,
    title: "Freelancer đánh giá",
    desc: "Xem chi tiết yêu cầu, dùng AI để đánh giá mức độ phù hợp và tiềm năng.",
  },
  {
    Icon: ClipboardCheck,
    title: "Quản lý dự án",
    desc: "Theo dõi tiến độ bằng Kanban, cập nhật trạng thái và ghi chú dự án.",
  },
  {
    Icon: TrendingUp,
    title: "Theo dõi quá trình và kết quả",
    desc: "Tự động nhắc nhở, báo cáo doanh thu, lịch sử hợp tác và đánh giá hiệu suất làm việc.",
  },
];

const FREELANCER_FEATURES = [
  "Quản lý danh sách khách hàng và liên hệ",
  "Bảng Kanban theo dõi cơ hội kinh doanh",
  "Tạo biểu mẫu yêu cầu tùy chỉnh",
  "Quản lý hợp đồng và doanh thu",
  "Trợ lý AI phân tích khách hàng tiềm năng",
];

const CLIENT_FEATURES = [
  "Gửi yêu cầu qua form — không cần đăng nhập",
];
