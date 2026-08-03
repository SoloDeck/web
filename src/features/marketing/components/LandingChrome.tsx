import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import {
  FOOTER_SCOPE_NOTE,
  NAV_ANCHORS,
  OFFICIAL_TITLE_VI,
} from "@/features/marketing/content";

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight">SoloDesk</span>
        </div>

        {/* Neo trong trang, để lúc bảo vệ nhảy thẳng tới đúng mục hội đồng hỏi.
            Phải là <a href="#..."> — <Link to="#ai"> là lỗi kiểu lúc build vì "#ai"
            không nằm trong cây route.

            Ẩn dưới `lg` chứ không phải `md`: sáu neo cộng logo cộng nút CTA cần khoảng
            750px, ở md (768px) là tràn.  #Huynh */}
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex">
          {NAV_ANCHORS.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="whitespace-nowrap transition-colors duration-200 hover:text-foreground"
            >
              {a.label}
            </a>
          ))}
        </nav>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          >
            Bắt đầu miễn phí
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">SoloDesk</span>
        </div>

        <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground/70">
          {OFFICIAL_TITLE_VI}
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground/70">
          {FOOTER_SCOPE_NOTE}
        </p>

        <p className="mt-6 text-xs text-muted-foreground">
          © 2026 SoloDesk. Tất cả quyền được bảo lưu.
        </p>
      </div>
    </footer>
  );
}
