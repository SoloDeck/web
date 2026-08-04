import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import { FACTS } from "@/features/marketing/content";

/**
 * Dải số liệu. Thay bộ số bịa cũ (500+ freelancer / 2.000+ dự án / 98% hài lòng) bằng
 * bốn con số kiểm chứng được — xem ghi chú ở `content.ts`.
 *
 * Bỏ `divide-x` của bản cũ: lưới giờ xuống 2 cột trên màn hẹp, vạch dọc sẽ rơi sai chỗ.
 */
export function FactsBand() {
  return (
    <section className="border-y border-border bg-card px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <RevealOnScroll key={f.label} delay={i * 100}>
              <div className="px-2 text-center">
                <div className="mb-1.5 text-3xl font-bold text-foreground tabular-nums sm:text-4xl lg:text-5xl">
                  {f.value}
                </div>
                <div className="text-xs leading-snug text-muted-foreground sm:text-sm">
                  {f.label}
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
