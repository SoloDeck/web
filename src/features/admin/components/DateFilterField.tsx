import { useState } from "react";
import { DateTextField } from "@/components/solodesk/DateTextField";
import { isoToDate, isoToText, textToIso } from "@/features/admin/dateFilter";
import { ngayChoApi } from "@/lib/ngayApi";

/**
 * Ô lọc theo ngày cho thanh bộ lọc: nhãn ngắn ("Từ" / "Đến") đứng NGAY TRƯỚC ô, cùng một hàng với các ô
 * lọc khác, và ngày hiện dạng ngày/tháng/năm kèm lịch tiếng Việt.
 *
 * Không dùng `<input type="date">`: ô đó hiện theo ngôn ngữ của trình duyệt (máy tiếng Anh ra
 * "mm/dd/yyyy"), lệch hẳn phần còn lại của giao diện tiếng Việt.
 *
 * `value` là chuỗi ISO `YYYY-MM-DD` hoặc "" (không lọc). Gõ dở dang (chưa thành một ngày thật) thì
 * KHÔNG đổi bộ lọc; rời ô mà vẫn chưa đúng thì trả chữ về ngày đang lọc, tránh để một ô nhìn như đã
 * nhập mà thực ra bộ lọc không đổi.  #Huynh
 */

export function DateFilterField({
  label,
  ariaLabel,
  value,
  onChange,
  minDate,
  maxDate,
}: {
  /** Chữ ngắn đứng trước ô. */
  label: string;
  /** Nhãn đọc ra cho ô, đầy đủ hơn `label`. */
  ariaLabel: string;
  value: string;
  onChange: (iso: string) => void;
  /** ISO — các ngày trước đó bị mờ, không chọn được. */
  minDate?: string;
  /** ISO — các ngày sau đó bị mờ, không chọn được. */
  maxDate?: string;
}) {
  const [text, setText] = useState(() => isoToText(value));
  const [lastValue, setLastValue] = useState(value);

  // Bộ lọc bị đặt lại từ bên ngoài (nút "Xoá bộ lọc") hoặc đổi bằng lịch thì chữ trong ô đi theo.
  if (value !== lastValue) {
    setLastValue(value);
    setText(isoToText(value));
  }

  function handleText(next: string) {
    setText(next);
    if (next.trim() === "") {
      onChange("");
      return;
    }
    const iso = textToIso(next);
    if (iso && iso !== value) onChange(iso);
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground" aria-hidden>
        {label}
      </span>
      <div className="w-[150px]">
        <DateTextField
          value={text}
          onValueChange={handleText}
          onBlur={() => setText(isoToText(value))}
          selected={isoToDate(value)}
          onPick={(date) => onChange(ngayChoApi(date))}
          minDate={isoToDate(minDate ?? "")}
          maxDate={isoToDate(maxDate ?? "")}
          calendarLabel={`Mở lịch: ${ariaLabel}`}
          inputClassName="h-9 rounded-xl py-0"
          ariaLabel={ariaLabel}
          align="start"
        />
      </div>
    </div>
  );
}
