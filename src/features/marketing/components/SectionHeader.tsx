import { RevealOnScroll } from "@/components/solodesk/RevealOnScroll";
import { cn } from "@/lib/utils";

/**
 * Khuôn tiêu đề dùng chung cho mọi dải nội dung: nhãn nhỏ in hoa, H2, và đoạn dẫn
 * TUỲ CHỌN.
 *
 * `body` để tuỳ chọn vì phần lớn dải không cần: tiêu đề đã nói đủ ý, thêm một đoạn
 * giải thích nữa chỉ làm trang dài ra. Dải nào bỏ `body` thì khoảng cách tự khít lại
 * chứ không chừa chỗ trống.  #Huynh
 */
export function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <RevealOnScroll>
      {/* mb nhỏ hơn bản trước: tiêu đề giờ ngắn, để nguyên khoảng cách cũ thì mỗi dải
          hở một mảng trắng to giữa tiêu đề và nội dung.  #Huynh */}
      <div className="mb-11 text-center">
        <p className="mb-3 text-sm font-semibold tracking-widest text-primary uppercase">
          {eyebrow}
        </p>
        <h2
          className={cn(
            // Chữ ít đi thì cho chữ to lên — phần nhìn phải có thứ gánh thay đoạn văn.
            "text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl",
            body && "mb-4",
          )}
        >
          {title}
        </h2>
        {body && (
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {body}
          </p>
        )}
      </div>
    </RevealOnScroll>
  );
}
