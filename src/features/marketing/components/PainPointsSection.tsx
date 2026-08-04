import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import { PAIN_HEADER, PAIN_POINTS } from "@/features/marketing/content";
import { SectionHeader } from "@/features/marketing/components/SectionHeader";

/**
 * Ba điểm đau nêu trong mục "Bối cảnh" của phiếu đề tài.
 *
 * Ô icon ở đây cố ý để màu trung tính (`bg-secondary`), không dùng màu primary — màu
 * chỉ xuất hiện từ dải "giải pháp" phía dưới. Đọc từ trên xuống sẽ thấy trang chuyển
 * từ vấn đề sang lời giải, thay vì mọi dải đều tím như nhau.
 */
export function PainPointsSection() {
  return (
    <section id="van-de" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeader {...PAIN_HEADER} />

        <div className="grid gap-6 md:grid-cols-3">
          {PAIN_POINTS.map((p, i) => (
            <RevealOnScroll key={p.title} delay={i * 80} className="h-full">
              <div className="flex h-full cursor-default flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-black/[0.06]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <p.Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base leading-snug font-semibold">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
