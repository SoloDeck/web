import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import { PIPELINE_HEADER, PIPELINE_STAGES } from "@/features/marketing/content";
import { SectionHeader } from "@/features/marketing/components/SectionHeader";
import { cn } from "@/lib/utils";

/**
 * Sáu giai đoạn Kanban, mỗi giai đoạn hiện CẢ tên tiếng Việt (đúng tên cột trong sản
 * phẩm) lẫn tên tiếng Anh (đúng chữ trong phiếu đề tài).
 *
 * Để hai thứ tiếng cạnh nhau là điểm đắt nhất của trang: hội đồng đối chiếu màn hình
 * với phiếu theo từng dòng mà không phải hỏi câu nào.
 */
export function PipelineStagesSection() {
  return (
    <section id="quy-trinh" className="scroll-mt-20 bg-secondary/20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader {...PIPELINE_HEADER} />

        <div className="relative grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {/* Đường nối giữa các bước, chỉ hiện trên màn rộng.
              Lớp định vị tuyệt đối phải nằm trên CHÍNH RevealOnScroll: nó render ra một
              div bọc, để `absolute` ở thẻ con thì cái bọc thành ô thứ 7 của lưới và đẩy
              lệch một cột. `8.33%` là nửa cột khi lưới có 6 cột.  #Huynh */}
          <RevealOnScroll
            delay={200}
            className="pointer-events-none absolute top-7 right-[8.33%] left-[8.33%] hidden lg:block"
          >
            <div
              className="h-px bg-gradient-to-r from-transparent via-border to-transparent"
              aria-hidden="true"
            />
          </RevealOnScroll>

          {PIPELINE_STAGES.map((stage, i) => (
            <RevealOnScroll key={stage.id} delay={i * 90} className="h-full">
              <div className="flex h-full flex-col items-center gap-3 text-center">
                <div className="relative z-10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-border bg-card shadow-sm">
                  <span className={cn("h-3.5 w-3.5 rounded-full", stage.dotClass)} />
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                </div>
                <div>
                  {/* Tên Việt là tên cột thật trong sản phẩm, tên Anh là chữ trong phiếu —
                      để cạnh nhau thì hội đồng đối chiếu được ngay, khỏi cần mô tả thêm. */}
                  <h3 className="text-sm font-semibold">{stage.title}</h3>
                  <p className="mt-1 text-[11px] font-medium tracking-wide text-primary/70">
                    {stage.en}
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
