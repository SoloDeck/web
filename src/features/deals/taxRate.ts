/**
 * Đổi qua lại giữa ô "Thuế/VAT (%)" người dùng gõ và `tax_rate` backend lưu.
 *
 * Backend lưu `tax_rate` là PHÂN SỐ (0.1 = 10%), cột `Numeric(5, 4)` — tức phần trăm giữ
 * được tối đa 2 chữ số thập phân (8,25% = 0.0825).
 *
 * Tách riêng vì ô này từng dùng chung bộ đọc với ô TIỀN. Bộ đọc tiền xoá mọi ký tự không
 * phải chữ số (để "1.500.000" ra 1500000), nên gõ "8,5" thành 85%, còn nạp lại hoá đơn
 * 7% thì `0.07 * 100` ra "7.000000000000001" → đọc thành 7 triệu tỷ phần trăm → 422.  #Huynh
 */

/** Phần trăm cao nhất nhận được — backend chặn `tax_rate` trong khoảng 0..1. */
const MAX_PERCENT = 100;

/**
 * Đọc chữ trong ô thành phân số cho backend.
 *
 * Nhận cả dấu phẩy lẫn dấu chấm làm dấu thập phân ("8,5" = "8.5"), bỏ qua khoảng trắng và
 * dấu "%". Ô trống = 0%. Trả `null` khi không phải một con số hợp lệ trong 0..100, để
 * nơi gọi báo lỗi thay vì lặng lẽ gửi đi một con số khác với thứ người dùng gõ.
 */
export function parseTaxRatePercent(input: string): number | null {
  const cleaned = input.replace(/[\s%]/g, "").replace(",", ".");
  if (cleaned === "") return 0;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;

  const percent = Number(cleaned);
  if (percent > MAX_PERCENT) return null;
  // Làm tròn tới 2 chữ số phần trăm — đúng độ chính xác cột DB giữ được.
  return Math.round(percent * 100) / 10000;
}

/**
 * Phân số từ backend → chữ hiển thị trong ô. 0.07 → "7", 0.085 → "8,5".
 *
 * Nhận cả chuỗi vì API trả Decimal dạng chuỗi ("0.0700"). Làm tròn trước khi in để không
 * bao giờ lộ ra đuôi lỗi dấu phẩy động kiểu "7.000000000000001".
 */
export function formatTaxRatePercent(rate: number | string | null | undefined): string {
  const fraction = Number(rate ?? 0);
  if (!Number.isFinite(fraction) || fraction <= 0) return "0";
  const percent = Math.round(fraction * 10000) / 100;
  return String(percent).replace(".", ",");
}
