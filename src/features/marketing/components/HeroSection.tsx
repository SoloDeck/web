import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

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
        {/* `leading-[1.05]` là mức sát nhất còn an toàn, ĐỪNG hạ nữa: ở `lg` thì
            `text-[3.6rem]` với `html{font-size:105%}` ra khoảng 60px, mà tiêu đề tiếng Việt
            có dấu chồng lên đầu chữ — section lại `overflow-hidden` nên phần bị xén sẽ mất
            im lặng, không có gì báo.

            Bậc thang 0/90/180/240ms cho bốn khối chữ, rồi Kanban ở 300ms: mắt đi từ trên
            xuống đúng thứ tự đọc thay vì cả trang bật lên một lượt.  #Huynh */}
        <h1 className="hero-rise mb-5 text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-[3.6rem]">
          {HERO.titleLead}{" "}
          <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {HERO.titleAccent}
          </span>
        </h1>

        <p className="hero-rise mx-auto mb-6 max-w-2xl text-base leading-relaxed text-muted-foreground [--hero-delay:90ms] sm:text-lg">
          {HERO.subtitle}
        </p>

        {/* Nút này từng bị gỡ với lý do "navbar đã có nút y hệt nên thêm ở đây là lặp". Đặt
            lại vì lý do đó chỉ đúng lúc đứng yên ở đỉnh trang: navbar cao 16 đơn vị, nút
            nằm mãi bên phải, còn mắt người đọc thì dừng ngay dưới phụ đề ở giữa trang — chỗ
            trước đây trống trơn. Vẫn đúng MỘT lối vào `/login`, không thêm nhánh nào.

            Chép nguyên khuôn nút của `AudienceSection.tsx` kể cả icon: hai nút cùng chữ
            "Bắt đầu miễn phí" trên cùng một trang mà khác hình thì đọc ra là hai thứ khác
            nhau.  #Huynh */}
        <Link
          to="/login"
          className="hero-rise mb-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 [--hero-delay:180ms] hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-0"
        >
          {HERO.ctaLabel} <ArrowRight className="h-4 w-4" />
        </Link>

        {/* Tên đề tài nguyên văn — thứ hội đồng dò khi đối chiếu web với phiếu. Để cỡ nhỏ
            và mờ: cần có mặt, không cần chiếm chỗ.

            `mb-14` cũ là để gánh chỗ của hàng nút đã gỡ; nút quay lại rồi thì trả bớt về
            `mb-10`, không thì hero dài ra và minh hoạ Kanban bị đẩy khỏi màn đầu.  #Huynh */}
        <p className="hero-rise mx-auto mb-10 max-w-2xl text-xs leading-relaxed text-muted-foreground/60 [--hero-delay:240ms]">
          {OFFICIAL_TITLE_VI}
        </p>

        <RevealOnScroll delay={300}>
          <div className="relative mx-auto max-w-5xl">
            <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-b from-primary/8 via-primary/3 to-transparent blur-2xl" />
            <HeroKanbanSim />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
