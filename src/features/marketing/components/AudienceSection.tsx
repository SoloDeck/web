import { Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, CheckCircle, MessageSquare } from "lucide-react";

import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import {
  AUDIENCE_HEADER,
  FREELANCER_FEATURES,
  INTAKE_FLOW,
} from "@/features/marketing/content";
import { SectionHeader } from "@/features/marketing/components/SectionHeader";

/**
 * Thẻ trái: người dùng của hệ thống (freelancer). Thẻ phải: khách của họ — KHÔNG phải
 * người dùng thứ hai, chỉ là người điền một biểu mẫu.
 *
 * Bản trước dựng đây thành "hai nhóm người dùng, một điểm vào" với một nút dẫn vào danh
 * bạ freelancer. Đó là hình dạng của một cái sàn. SoloDesk là CRM độc lập cho từng
 * freelancer, nên thẻ phải giờ kể LUỒNG khách đi vào, không mời khách đi chọn người.
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
                <h3 className="mb-1 text-xl font-bold">Khách hàng của bạn</h3>
                <p className="mb-5 text-xs text-muted-foreground">không cần tạo tài khoản</p>
                <ol className="mb-8 space-y-2.5">
                  {INTAKE_FLOW.map((step, i) => (
                    <li key={step} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-sm text-muted-foreground">
                  Link biểu mẫu nằm ở mục <strong className="font-semibold">Biểu mẫu tiếp nhận</strong>{" "}
                  sau khi bạn đăng nhập.
                </p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
