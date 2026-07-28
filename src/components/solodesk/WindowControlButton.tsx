import type React from "react";
import { cn } from "@/lib/utils";

/**
 * Nút điều khiển cửa sổ ở góc phải header modal: thu nhỏ, đóng.
 *
 * Vì sao CHỈ BIỂU TƯỢNG: cửa sổ trình duyệt (Chrome, Cốc Cốc) chỉ vẽ `—` và `✕`, ai cũng
 * hiểu — kèm chữ vào chỉ làm header rối. Trước đây mỗi modal tự viết nút này nên lệch nhau:
 * chỗ có chữ "Thu nhỏ"/"Hủy", chỗ chỉ icon; cỡ icon `h-3.5` lẫn `h-4`; và phần lớn THIẾU
 * `title` nên rê chuột không hiện gì.
 *
 * Vì sao `label` bắt buộc và đi vào CẢ HAI thuộc tính: bỏ chữ đi thì nhãn là thứ DUY NHẤT
 * còn nói được nút làm gì — `title` cho người rê chuột, `aria-label` cho trình đọc màn hình
 * (và cho test tìm nút bằng `getByRole("button", { name: ... })`). Thiếu một trong hai là
 * nút câm với một nhóm người dùng.  #Huynh
 */
export function WindowControlButton({
  icon: Icon,
  label,
  onClick,
  tone = "default",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  /** Vừa là `title` (rê chuột) vừa là `aria-label`. Viết như một hành động: "Thu nhỏ", "Đóng". */
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        // Ô vuông 32px: vùng bấm đủ lớn và ĐỀU nhau giữa các nút, đúng kiểu nút cửa sổ.
        "grid size-8 shrink-0 place-items-center rounded-md transition-colors",
        tone === "danger"
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        className
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
