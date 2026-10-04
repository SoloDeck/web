/**
 * Tìm kiếm trong tab "Tài liệu" của deal — phần THUẦN, không dính React.
 *
 * Người dùng gõ không dấu cũng phải tìm ra ("bao gia", "hop dong", "INV-2026"), và gõ nhiều chữ thì
 * mỗi chữ phải xuất hiện ở đâu đó trên hàng ("hoa don 2", "bản nháp 16/10"). Nên: bỏ dấu tiếng Việt
 * cả hai phía, rồi đòi MỌI chữ của ô tìm đều có mặt trong phần chữ của hàng.  #Huynh
 */

/** Hạ chữ thường, bỏ dấu tiếng Việt (kể cả đ → d), gộp khoảng trắng thừa. */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hàng có khớp ô tìm không. Ô tìm trống thì khớp mọi hàng.
 *
 * `fields` là các đoạn chữ NGƯỜI DÙNG THẤY trên hàng (tên, mã, nhãn trạng thái, ngày, số tiền...),
 * để thứ tìm ra được luôn là thứ nhìn thấy được.
 */
export function matchesDocumentSearch(
  query: string,
  fields: ReadonlyArray<string | number | null | undefined>
): boolean {
  const tokens = normalizeSearchText(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalizeSearchText(
    fields.filter((field) => field !== null && field !== undefined && field !== "").join(" ")
  );
  return tokens.every((token) => haystack.includes(token));
}
