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
