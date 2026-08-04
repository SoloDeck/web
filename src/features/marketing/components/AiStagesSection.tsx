import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import { LEVEL_UI } from "@/features/ai/qualificationUi";
import type { LeadScore } from "@/features/deals/types";
import {
  AI_HEADER,
  AI_STAGES,
  CONTRACT_DISCLAIMER,
  SCORE_THRESHOLDS,
} from "@/features/marketing/content";
import { SectionHeader } from "@/features/marketing/components/SectionHeader";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

const SCORE_ORDER: LeadScore[] = ["hot", "warm", "cold"];

/**
 * Ba nhãn HOT / WARM / COLD hiện lần lượt KHI CUỘN TỚI.
 *
 * Dùng thẳng `useScrollReveal` thay vì bọc `<RevealOnScroll>` vì ở đây cần biết đã lọt
 * khung nhìn hay chưa: `animate-in` của tw-animate-css chạy lúc mount, mà mount là lúc
 * tải trang — gắn thẳng thì hiệu ứng đã diễn xong từ lâu trước khi người dùng cuộn
 * xuống đây.  #Huynh
 */
function LeadScoreBadges() {
  const { ref, isVisible } = useScrollReveal();

  return (
    // min-h giữ sẵn chỗ để nội dung bên dưới không giật lên khi badge xuất hiện.
    <div ref={ref} className="flex min-h-8 flex-wrap items-center gap-2">
      {isVisible &&
        SCORE_ORDER.map((level, i) => {
          const ui = LEVEL_UI[level];
          const Icon = ui.icon;
          return (
            <span
              key={level}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                "animate-in fade-in zoom-in-95 fill-mode-both duration-300",
                i === 1 && "delay-150",
                i === 2 && "delay-300",
                ui.badgeClass,
              )}
            >
              <Icon className="h-2.5 w-2.5" />
              {ui.label}
            </span>
          );
        })}
    </div>
  );
}

export function AiStagesSection() {
  return (
    <section id="ai" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader {...AI_HEADER} />

        <div className="grid gap-6 lg:grid-cols-3">
          {AI_STAGES.map((stage, i) => (
            <RevealOnScroll key={stage.name} delay={i * 120} className="h-full">
              <div className="group flex h-full cursor-default flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-lg hover:shadow-black/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110">
                    <stage.Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    {stage.step}
                  </span>
                </div>

                <div>
                  <h3 className="text-base leading-snug font-semibold">{stage.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{stage.nameVi}</p>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">{stage.body}</p>

                {/* Minh hoạ riêng cho từng giai đoạn, đặt cuối thẻ để ba thẻ đều đáy. */}
                <div className="mt-auto pt-2">
                  {i === 0 && (
                    <>
                      <LeadScoreBadges />
                      {/* Ngưỡng lấy từ scoring.py — ngắn, toàn số, chứng minh được bằng code. */}
                      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                        {SCORE_THRESHOLDS}
                      </p>
                    </>
                  )}

                  {/* Câu giới hạn trách nhiệm. Bản trước đóng khung cảnh báo vàng cho nổi,
                      nhưng trang giới thiệu không cần hét lên — một dòng nhỏ là đủ đúng
                      và đỡ rối mắt.  #Huynh */}
                  {i === 1 && (
                    <p className="text-xs leading-relaxed text-muted-foreground/70">
                      {CONTRACT_DISCLAIMER}
                    </p>
                  )}
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
