const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a number as Vietnamese đồng, e.g. 25000000 -> "25.000.000 ₫". */
export const formatVND = (value: number): string => vndFormatter.format(value);

/** @deprecated Use {@link formatVND} instead. Kept for backward compatibility. */
export const formatCurrency = formatVND;

/**
 * Nhóm hàng nghìn cho Ô NHẬP: 300000 -> "300.000".
 *
 * KHÔNG kèm "₫" như {@link formatVND}: nhãn ô đã ghi sẵn đơn vị, và một ký hiệu tiền nằm
 * ngay trong chuỗi đang gõ chỉ làm con trỏ nhảy chỗ.  #Huynh
 */
export const groupThousands = (value: number): string => value.toLocaleString("vi-VN");

/**
 * Chiều ngược lại của {@link groupThousands}: gõ "300.000" hay "300000" đều ra 300000.
 *
 * Chỉ giữ chữ số, nên ô nhập không cần `type="number"` — mà cũng KHÔNG dùng được: trình
 * duyệt coi "300.000" là giá trị không hợp lệ và trả về chuỗi rỗng.
 */
export const parseGrouped = (value: string): number => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};
