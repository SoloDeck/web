/**
 * Bảng nhãn cho thuộc tính `items` của `<Select>`.
 *
 * Thiếu `items`, ô chọn chỉ biết GIÁ TRỊ THÔ: danh sách xổ ra hiện nhãn tiếng Việt, nhưng sau khi
 * chọn (hoặc ở ô đang đóng) nó lại in ra "freelancer", "active", "all", mã gói dạng UUID... —
 * tiếng Anh và mã máy trong một giao diện tiếng Việt.  #Huynh
 *
 * `extra` đặt TRƯỚC các lựa chọn: dùng cho mục "Tất cả ..." đứng đầu danh sách.
 */
export function labelMap(
  options: readonly { value: string; label: string }[],
  extra: Record<string, string> = {}
): Record<string, string> {
  return { ...extra, ...Object.fromEntries(options.map((option) => [option.value, option.label])) };
}
