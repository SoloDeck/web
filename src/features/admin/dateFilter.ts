/**
 * Chuyển qua lại giữa chuỗi ISO `YYYY-MM-DD` (thứ bộ lọc giữ và gửi lên máy chủ) và chữ ngày/tháng/năm
 * người dùng gõ. Tách khỏi component để kiểm riêng và để file component chỉ export component.
 */

export function isoToText(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

/** "05/10/2026" hoặc "5/10/2026" → "2026-10-05"; `null` nếu chưa phải một ngày có thật (31/02...). */
export function textToIso(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isoToDate(iso: string): Date | undefined {
  return iso ? new Date(`${iso}T00:00:00`) : undefined;
}
