/**
 * Đưa chữ về dạng so sánh được khi tìm kiếm: chữ thường, bỏ dấu tiếng Việt, gộp khoảng trắng.
 *
 * Người dùng hay gõ không dấu ("lap trinh") để tìm tên có dấu ("Lập trình"), nên cả chữ gõ vào lẫn
 * tên đem so đều phải qua cùng một cửa này. Chữ "đ" không phải chữ cái có dấu để tách (NFD không
 * bóc được gạch ngang của nó) nên xử lý riêng.  #Huynh
 */
export function foldVietnamese(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Tên có chứa chữ đang tìm không. Ô tìm trống thì khớp tất cả. */
export function matchesSearch(name: string, search: string): boolean {
  const needle = foldVietnamese(search);
  return needle === "" || foldVietnamese(name).includes(needle);
}
