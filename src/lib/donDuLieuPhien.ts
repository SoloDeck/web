/**
 * Dọn sạch mọi dữ liệu gắn với tài khoản khi phiên kết thúc.
 *
 * Vì sao phải có một chỗ dùng chung thay vì mỗi nơi tự xoá khoá của mình: đăng xuất trước
 * đây chỉ xoá hai khoá phiên (`solodesk.auth.session.v1`, `solodesk.auth.refresh.v1`),
 * còn mọi thứ khác nằm nguyên trong localStorage của trình duyệt. Máy dùng chung — quán
 * net, máy phòng lab, laptop chung của nhóm — thì người đăng nhập sau thấy được dữ liệu
 * của người trước:
 *
 *   - `solodesk.profile.v1` — bản nháp hồ sơ: tên, nghề, giới thiệu bản thân. Nặng nhất
 *     vì nó không chỉ HIỆN ra mà còn được lưu ĐÈ lên hồ sơ thật của tài khoản mới ở
 *     những trường server trả rỗng.
 *   - `solodesk.ai.dismissedJobs.v1` — danh sách việc AI đã ẩn, mang theo tên khách hàng.
 *   - `solodesk.deal-history.*` — lịch sử thao tác trên từng deal.
 *   - `solodesk.invoice-reminder-dismissed` — nhắc hoá đơn đã tắt.
 *
 * Quét theo TIỀN TỐ chứ không theo danh sách khoá liệt kê sẵn. Cố ý: danh sách liệt kê
 * tay thì lần sau ai đó thêm một khoá mới là lỗ hổng này quay lại y nguyên, mà không ai
 * nhớ ra phải cập nhật chỗ này. Quét tiền tố thì khoá mới tự động được dọn.
 */

/** Mọi khoá của sản phẩm đều bắt đầu bằng chuỗi này. */
export const TIEN_TO_KHOA = "solodesk.";

/**
 * `lay_kho` là một HÀM chứ không phải đối tượng kho, cố ý.
 *
 * Ở chế độ ẩn danh hoặc khi người dùng chặn dữ liệu trang, chính việc ĐỌC
 * `window.localStorage` đã ném lỗi. Nhận sẵn đối tượng thì lỗi nổ ở chỗ gọi — tức ngoài
 * `try` này — và đăng xuất hỏng theo. Nhận hàm thì lần đọc đầu tiên cũng nằm trong `try`.
 */
function quet(lay_kho: () => Storage): void {
  try {
    const kho = lay_kho();
    // Gom tên khoá trước rồi mới xoá: xoá ngay trong lúc duyệt làm chỉ số dịch đi và
    // bỏ sót khoá kế tiếp.
    const can_xoa: string[] = [];
    for (let i = 0; i < kho.length; i += 1) {
      const ten = kho.key(i);
      if (ten && ten.startsWith(TIEN_TO_KHOA)) can_xoa.push(ten);
    }
    for (const ten of can_xoa) kho.removeItem(ten);
  } catch {
    /* chế độ ẩn danh hoặc trình duyệt chặn kho — không có gì để dọn thì thôi */
  }
}

/**
 * Xoá toàn bộ dữ liệu tài khoản ở cả `localStorage` lẫn `sessionStorage`.
 *
 * Gọi ở đúng hai chỗ: lúc người dùng bấm đăng xuất, và lúc phiên hết hạn bị đá về trang
 * đăng nhập. Không bao giờ ném lỗi — dọn không được thì cũng không được chặn đường đăng
 * xuất của người dùng.
 */
export function donDuLieuPhienNguoiDung(): void {
  quet(() => localStorage);
  quet(() => sessionStorage);
}
