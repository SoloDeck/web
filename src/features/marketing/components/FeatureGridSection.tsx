import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import { FEATURE_HEADER, FEATURE_TILES } from "@/features/marketing/content";
import { SectionHeader } from "@/features/marketing/components/SectionHeader";

/**
 * Lưới phân hệ: icon + một nhãn, không mô tả.
 *
 * Đây là chỗ gánh cảm giác "nhiều tính năng" thay cho những đoạn văn đã cắt — dày về
 * hình mà gần như không tốn chữ.
 */
export function FeatureGridSection() {
  return (
    // Nền xám nhạt để xen kẽ với hai dải trắng kề bên. Trước đây nhịp này do dải nền
    // tối "Khác biệt thị trường Việt Nam" gánh; bỏ dải đó thì ba dải liền nhau trắng
    // trơn, trang trông phẳng lì.  #Huynh
    <section id="phan-he" className="scroll-mt-20 bg-secondary/20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <SectionHeader {...FEATURE_HEADER} />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {FEATURE_TILES.map((tile, i) => (
            <RevealOnScroll key={tile.label} delay={i * 60} className="h-full">
              <div className="group flex h-full cursor-default flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/25 hover:shadow-lg hover:shadow-black/[0.06]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                  <tile.Icon className="h-5 w-5" />
                </div>
                <span className="text-xs leading-snug font-semibold">{tile.label}</span>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
