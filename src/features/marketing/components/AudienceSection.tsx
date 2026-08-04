import { Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, CheckCircle, MessageSquare } from "lucide-react";

import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import {
  AUDIENCE_HEADER,
  CLIENT_FEATURES,
  FREELANCER_FEATURES,
} from "@/features/marketing/content";
import { SectionHeader } from "@/features/marketing/components/SectionHeader";

/**
 * Hai nhóm người dùng — chính là luồng màn hình số 1 trong SRS: "From Landing Page,
 * the visitor browses Freelancer Directory or goes to Login."
 *
 * `h-full` phải nằm trên RevealOnScroll chứ không chỉ ở thẻ con: nó render ra một div
 * bọc, `h-full` của thẻ con tính theo cái bọc chứ không theo hàng lưới. Bản cũ đặt
 * thiếu nên hai thẻ cao không bằng nhau khi nội dung lệch dòng.  #Huynh
 */
export function AudienceSection() {
  return (
    <section id="danh-cho-ai" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeader {...AUDIENCE_HEADER} />

        <div className="grid gap-6 md:grid-cols-2">
          <RevealOnScroll delay={0} className="h-full">
            <div className="group relative h-full overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent p-8 transition-all duration-300 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/5">
              <div
                className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-primary/8 blur-2xl"
                aria-hidden="true"
              />
              <div className="relative">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                  <Briefcase className="h-6 w-6" />
                </div>
                <h3 className="mb-1 text-xl font-bold">Chuyên gia dịch vụ độc lập</h3>
                <p className="mb-5 text-xs text-muted-foreground">
                  freelancer, thiết kế, lập trình, tư vấn, copywriter, nhiếp ảnh
                </p>
                <ul className="mb-8 space-y-2.5">
                  {FREELANCER_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                >
                  Bắt đầu miễn phí <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={120} className="h-full">
            <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-border/60 hover:shadow-xl hover:shadow-black/5">
              <div
                className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-secondary blur-2xl"
                aria-hidden="true"
              />
              <div className="relative">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-secondary transition-transform duration-300 group-hover:scale-110">
                  <MessageSquare className="h-6 w-6 text-foreground/70" />
                </div>
                <h3 className="mb-1 text-xl font-bold">Khách hàng cần thuê</h3>
                <p className="mb-5 text-xs text-muted-foreground">không cần tạo tài khoản</p>
                <ul className="mb-8 space-y-2.5">
                  {CLIENT_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/find-freelancer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:shadow-sm active:translate-y-0"
                >
                  Xem danh bạ freelancer <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
