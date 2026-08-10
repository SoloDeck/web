import type { CSSProperties } from "react";

/**
 * Màu chủ đạo của trang công khai.
 *
 * Cách áp màu: ghi đè biến CSS `--primary` trên phần tử gốc của trang. `src/index.css` khai
 * `@theme inline { --color-primary: var(--primary) }`, nên utility Tailwind biên dịch thành
 * `background-color: var(--primary)` — giải biến TẠI CHỖ DÙNG. Ghi đè trên một cây con là
 * mọi `bg-primary`, `text-primary`, `bg-primary/10`, `from-primary` bên trong tự đổi màu
 * theo, kể cả các biến thể độ mờ (chúng dùng `color-mix` với chính biến đó).
 *
 * Đã đo trên trình duyệt thật: nút submit từ `oklch(0.5 0.18 270)` sang `rgb(15,118,110)`
 * chỉ bằng một dòng `style` trên tổ tiên, không sửa một class nào.  #Huynh
 */

/** Tím SoloDesk — xấp xỉ `oklch(0.50 0.18 270)` đang là `--primary` mặc định. */
export const DEFAULT_BRAND_COLOR = "#5b3df5";

export type BrandPreset = { hex: string; label: string };

/**
 * Bảy màu chọn sẵn, đều đủ tối để chữ trắng đạt tương phản ≥ 4.5:1 và cùng "họ" độ đậm với
 * tím mặc định, nên đổi màu nào trang cũng giữ được cảm giác cân đối.
 */
export const BRAND_PRESETS: BrandPreset[] = [
  { hex: DEFAULT_BRAND_COLOR, label: "Tím SoloDesk" },
  { hex: "#1d4ed8", label: "Xanh dương" },
  { hex: "#0f766e", label: "Xanh ngọc" },
  { hex: "#15803d", label: "Xanh lá" },
  { hex: "#b45309", label: "Hổ phách" },
  { hex: "#be123c", label: "Đỏ mận" },
  { hex: "#334155", label: "Than chì" },
];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX.test(value.trim());
}

function toRgb(hex: string): [number, number, number] {
  let h = hex.trim().slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Màu chữ đọc được trên nền `hex` — trắng cho nền tối, gần-đen cho nền sáng.
 *
 * Ngưỡng 0.208 là điểm hoà giữa tương phản-với-trắng và tương phản-với-đen theo WCAG. Bộ
 * màu chọn sẵn đều đủ tối để ra chữ trắng; hàm này là lưới an toàn cho ô chọn màu tự do,
 * nếu không thì ai chọn vàng chanh sẽ được nút chữ trắng trên nền vàng, không đọc nổi.
 */
export function readableOn(hex: string): string {
  const srgb = toRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return luminance > 0.208 ? "#0f172a" : "#ffffff";
}

/**
 * Style gắn lên phần tử gốc của trang công khai để nhuộm cả cây theo màu freelancer.
 *
 * Trả `undefined` khi chưa chọn màu — để nguyên tím mặc định của app thay vì ghi đè bằng
 * chính giá trị đó (ít việc hơn cho trình duyệt, và dễ nhìn ra "chưa cấu hình" lúc gỡ lỗi).
 */
export function brandStyle(hex: string | null | undefined): CSSProperties | undefined {
  if (!isHexColor(hex)) return undefined;
  const color = hex.trim().toLowerCase();
  return {
    "--primary": color,
    // Sáng hơn 38% dùng cho đầu kia của các gradient. `color-mix` được Chrome 111+,
    // Safari 16.2+, Firefox 113+ hỗ trợ.
    "--primary-glow": `color-mix(in oklab, ${color} 62%, white)`,
    "--ring": color,
    "--primary-foreground": readableOn(color),
  } as CSSProperties;
}
