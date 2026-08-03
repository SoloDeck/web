import { Link } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";

import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import { HERO, OFFICIAL_TITLE_VI } from "@/features/marketing/content";
import { HeroKanbanSim } from "@/features/marketing/components/HeroKanbanSim";

export function HeroSection() {
  return (
    // Đệm trên mỏng hơn đệm dưới: bỏ badge rồi mà giữ `py-32` cân đều thì ngay dưới
    // navbar hở một mảng trắng trơn ~134px trước khi tới tiêu đề.  #Huynh
    <section
      id="trang-chu"
      className="relative scroll-mt-20 overflow-hidden px-4 pt-12 pb-24 sm:px-6 sm:pt-16 sm:pb-32"
    >
      {/* Aurora background blobs — giữ nguyên kích thước/blur/opacity cũ, chỉ thêm class
          đánh dấu `aurora-blob` để tắt được khi người dùng bật giảm chuyển động. */}
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <div
          className="aurora-blob absolute animate-[aurora-1_14s_ease-in-out_infinite] rounded-full opacity-[0.16] blur-[130px]"
          style={{ width: 700, height: 700, background: "var(--primary)", top: -260, left: -160 }}
        />
        <div
          className="aurora-blob absolute animate-[aurora-2_19s_ease-in-out_infinite] rounded-full opacity-[0.11] blur-[110px]"
          style={{ width: 580, height: 580, background: "var(--primary-glow)", top: -200, right: -130 }}
        />
        <div
          className="aurora-blob absolute animate-[aurora-3_23s_ease-in-out_infinite] rounded-full opacity-[0.09] blur-[150px]"
          style={{ width: 520, height: 520, background: "oklch(0.65 0.15 220)", bottom: -80, left: "38%" }}
        />
      </div>

      <div className="hero-dot-grid pointer-events-none absolute inset-0 select-none" aria-hidden="true" />

      <div className="relative mx-auto max-w-4xl text-center">
        <h1 className="mb-5 text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl lg:text-[3.6rem]">
          {HERO.titleLead}{" "}
          <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {HERO.titleAccent}
          </span>
        </h1>

        <p className="mx-auto mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {HERO.subtitle}
        </p>

        {/* Tên đề tài nguyên văn — thứ hội đồng dò khi đối chiếu web với phiếu. Để cỡ nhỏ
            và mờ: cần có mặt, không cần chiếm chỗ.  #Huynh */}
        <p className="mx-auto mb-10 max-w-2xl text-xs leading-relaxed text-muted-foreground/60">
          {OFFICIAL_TITLE_VI}
        </p>

        {/* Hai lối vào theo luồng màn hình số 1 của SRS: khách xem danh bạ, freelancer đăng nhập. */}
        <div className="mb-16 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 sm:w-auto"
          >
            {HERO.ctaFreelancer} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/find-freelancer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:shadow-sm active:translate-y-0 sm:w-auto"
          >
            <Search className="h-4 w-4" />
            {HERO.ctaClient}
          </Link>
        </div>

        <RevealOnScroll>
          <div className="relative mx-auto max-w-5xl">
            <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-b from-primary/8 via-primary/3 to-transparent blur-2xl" />
            <HeroKanbanSim />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
