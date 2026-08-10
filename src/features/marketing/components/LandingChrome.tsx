import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import {
  FOOTER_SCOPE_NOTE,
  NAV_ANCHORS,
  NAV_ANCHOR_IDS,
  OFFICIAL_TITLE_VI,
} from "@/features/marketing/content";
import { useScrollSpy } from "@/features/marketing/hooks/useScrollSpy";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

/** Vòng focus dùng chung cho mọi thứ bấm được trên trang giới thiệu. */
const FOCUS_RING = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function LandingNavbar() {
  const activeId = useScrollSpy(NAV_ANCHOR_IDS);
  const scrolled = useScrolled();

  return (
    // Bóng chỉ xuất hiện SAU khi cuộn. Ở đỉnh trang, header liền mạch với hero nên đổ bóng
    // sẵn trông như một đường kẻ thừa; cuộn rồi thì mới cần tách nó khỏi nội dung trôi
    // bên dưới.  #Huynh
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md",
        "transition-shadow duration-300 motion-reduce:transition-none",
        scrolled ? "shadow-md shadow-black/[0.06]" : "shadow-none",
      )}
    >
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
        <nav
          aria-label="Điều hướng nội dung trang"
          className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex"
        >
          {NAV_ANCHORS.map((a) => {
            const isActive = activeId === a.href.slice(1);
            return (
              <a
                key={a.href}
                href={a.href}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative rounded-sm whitespace-nowrap transition-colors duration-200 hover:text-foreground",
                  FOCUS_RING,
                  // Gạch chân bằng `scaleX` từ mép trái, KHÔNG animate `width`: cả repo
                  // dùng transform, mà transform cũng không buộc trình duyệt tính lại bố cục.
                  "after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:origin-left",
                  "after:scale-x-0 after:rounded-full after:bg-primary after:content-['']",
                  "after:transition-transform after:duration-200 motion-reduce:after:transition-none",
                  "hover:after:scale-x-100",
                  isActive && "text-foreground after:scale-x-100",
                )}
              >
                {a.label}
              </a>
            );
          })}
        </nav>

        {/* `<div>` chứ không phải `<nav>` như bản cũ: một nút hành động đứng lẻ không phải
            vùng điều hướng. Để `<nav>` là trình đọc màn hình đọc ra hai landmark "navigation"
            trùng tên trong cùng một header, người dùng phải mò từng cái mới biết cái nào là
            menu.  #Huynh */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground",
              "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
              FOCUS_RING,
            )}
          >
            Bắt đầu miễn phí
          </Link>
        </div>
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
