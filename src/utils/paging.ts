/**
 * Phân trang phía trình duyệt — phần TÍNH TOÁN, tách khỏi giao diện.
 *
 * Danh sách dự án và dòng thời gian của khách hàng đều tải một lần rồi lọc/sắp tại chỗ, nên
 * phân trang cũng làm tại chỗ. Cái bẫy duy nhất nhưng chắc chắn gặp: người dùng đang ở trang 3
 * rồi gõ vào ô tìm kiếm, danh sách rút còn 2 mục — trang 3 không còn tồn tại và màn hình TRẮNG
 * TRƠN, trông y như mất dữ liệu. Vì vậy mọi phép cắt đều đi qua `clampPage`.  #Huynh
 */

/** Số trang, tối thiểu 1 — danh sách rỗng vẫn là "trang 1/1" chứ không phải 1/0. */
export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Kéo số trang về khoảng hợp lệ. Trang vượt quá thì về trang CUỐI, không về trang 1 —
 *  người dùng đang xem cuối danh sách thì giữ họ ở gần đó. */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, Math.trunc(page) || 1), pageCount(total, pageSize));
}

/** Lát cắt của trang hiện tại, đã chống trang lố. */
export function pageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const trang = clampPage(page, items.length, pageSize);
  const dau = (trang - 1) * pageSize;
  return items.slice(dau, dau + pageSize);
}

/** "3–7 / 24" — cho người dùng biết mình đang ở đâu trong tổng thể. */
export function pageRangeLabel(page: number, total: number, pageSize: number): string {
  if (total === 0) return "0";
  const trang = clampPage(page, total, pageSize);
  const dau = (trang - 1) * pageSize + 1;
  const cuoi = Math.min(trang * pageSize, total);
  return dau === cuoi ? `${dau} / ${total}` : `${dau}–${cuoi} / ${total}`;
}
