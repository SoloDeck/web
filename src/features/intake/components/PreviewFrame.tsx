import { useEffect, useRef, useState, type ReactNode } from "react";
import { brandStyle } from "@/features/intake/brandTheme";

/** Bề rộng trang thật (max-w-5xl + padding) — dựng ở khổ này rồi mới thu nhỏ. */
const REAL_PAGE_WIDTH = 1024;

/**
 * Khung xem trước thu nhỏ.
 *
 * Không thể chỉ nhét nội dung vào một cột hẹp: các breakpoint `sm:`/`lg:` của Tailwind đo
 * BỀ RỘNG CỬA SỔ chứ không phải bề rộng khung chứa, nên trong ô 400px nó vẫn dựng layout
 * desktop rồi vỡ — tên xuống ba dòng, nút tràn ra ngoài. Cách đúng là dựng ở đúng khổ trang
 * thật (1024px) rồi `scale` xuống, và như vậy cũng trung thực hơn: freelancer thấy đúng bố
 * cục khách sẽ thấy, chỉ nhỏ hơn.
 *
 * Phần tử đã `scale` vẫn chiếm chỗ theo kích thước GỐC trong luồng bố cục, nên phải tự đo
 * chiều cao thật rồi gán lại cho khung ngoài — không thì dưới khung thừa ra một mảng trắng
 * bằng đúng phần bị thu nhỏ.
 *
 * Nội dung bên trong bị VÔ HIỆU HOÁ (`inert` + `pointer-events-none`): đây là bản xem trước,
 * mà bên trong nay là biểu mẫu THẬT — không chặn thì gõ được, bấm Gửi được ở cỡ 40%, và Tab
 * từ bàn phím vẫn lọt vào từng ô.  #Huynh
 */
export function PreviewFrame({
  brandColor,
  maxHeight,
  children,
}: {
  brandColor: string;
  /** Chặn chiều cao rồi cho cuộn trong khung. Thiếu nó thì hồ sơ + biểu mẫu đội khung cao vống lên. */
  maxHeight?: number;
  children: ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      const s = outer.clientWidth / REAL_PAGE_WIDTH;
      setScale(s);
      setHeight(inner.scrollHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
    // Mảng rỗng là ĐỦ: hai ref ổn định, còn mọi thay đổi kích thước đã có ResizeObserver lo.
    // Bỏ trống mảng phụ thuộc thì effect chạy lại sau MỌI lần render và dựng lại observer
    // mỗi lần — với biểu mẫu sống bên trong thì đó là một vòng cho mỗi phím gõ.
  }, []);

  const framedHeight =
    height === undefined ? undefined : maxHeight ? Math.min(height, maxHeight) : height;

  return (
    // `overflow-x-hidden` là BẮT BUỘC, không phải cho gọn: phần tử đã `scale` vẫn chiếm chỗ
    // theo bề rộng GỐC (1024px) trong luồng bố cục, nên khung luôn tràn ngang. Chỉ đặt
    // `overflow-y-auto` thì trục X tự thành `auto` theo (một trục khác `visible` là trục kia
    // hết `visible`) và lòi ra một thanh kéo ngang vô nghĩa — kéo sang chỉ thấy khoảng trắng.
    <div
      ref={outerRef}
      className="overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-background"
      style={{ height: framedHeight }}
    >
      <div
        ref={innerRef}
        inert
        style={{
          width: REAL_PAGE_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          ...brandStyle(brandColor),
        }}
        className="pointer-events-none px-4 pb-6"
      >
        {children}
      </div>
    </div>
  );
}
