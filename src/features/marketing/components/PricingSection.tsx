import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import { PLANS, PRICING_HEADER } from "@/features/marketing/content";
import { SectionHeader } from "@/features/marketing/components/SectionHeader";
import { cn } from "@/lib/utils";

/**
 * Bảng giá. Mọi con số khớp `backend/.../seeders/plans.py`, nên hỏi tới là mở file ra
 * chỉ được. Có mô hình kinh doanh trên màn hình cũng trả lời sẵn câu "mô hình kinh
 * doanh của các bạn là gì".
 */
export function PricingSection() {
  return (
    <section id="bang-gia" className="scroll-mt-20 bg-secondary/20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeader {...PRICING_HEADER} />

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <RevealOnScroll key={plan.name} delay={i * 100} className="h-full">
              <div
                className={cn(
                  "flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-black/[0.06]",
                  plan.highlight
                    ? "border-primary/30 ring-1 ring-primary/25 lg:scale-[1.03]"
                    : "border-border",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold">{plan.name}</h3>
                  {plan.badge && (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tabular-nums">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  )}
                </p>

                <ul className="mt-6 mb-8 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 flex-shrink-0",
                          plan.highlight ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/login"
                  className={cn(
                    "mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:shadow-lg"
                      : "border border-border bg-background hover:bg-secondary hover:shadow-sm",
                  )}
                >
                  {plan.price === "0 đ" ? "Dùng thử miễn phí" : `Chọn gói ${plan.name}`}
                </Link>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
