import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { vi } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type DateTextFieldProps = {
  id?: string;
  /** Chữ đang gõ trong ô, dạng ngày/tháng/năm. */
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  /** Ngày hợp lệ đang chọn: lịch đánh dấu nó và mở đúng tháng của nó. */
  selected?: Date;
  /** Người dùng bấm chọn một ngày trên lịch. */
  onPick: (date: Date) => void;
  /** Các ngày trước ngày này bị mờ đi, không chọn được. */
  minDate?: Date;
  disabled?: boolean;
  placeholder?: string;
  /** Nhãn đọc ra của nút mở lịch. */
  calendarLabel: string;
  /** Lịch mở ra căn theo mép phải hay mép trái của ô. */
  align?: "start" | "end";
};

/**
 * Ô ngày GÕ kiểu Việt (ngày/tháng/năm) kèm lịch bấm chọn.
 *
 * Không dùng `<input type="date">`: ô đó hiện theo locale của MÁY (máy cài tiếng Anh ra
 * mm/dd/yyyy), người Việt đọc "03/07" thành 3 tháng 7 rồi chọn nhầm cả tháng. Lịch ở đây là
 * tiếng Việt cho ai thích bấm, còn chữ gõ tay vẫn giữ nguyên cho ai quen gõ.
 *
 * Esc đóng riêng cái lịch, không kéo theo đóng luôn cửa sổ đang chứa nó.  #Huynh
 */
export function DateTextField({
  id,
  value,
  onValueChange,
  onBlur,
  selected,
  onPick,
  minDate,
  disabled = false,
  placeholder = "dd/mm/yyyy",
  calendarLabel,
  align = "end",
}: DateTextFieldProps) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const shown = open && !disabled;

  useEffect(() => {
    if (!shown) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    // Pha bắt: chặn Esc trước khi nó tới cửa sổ cha.
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [shown]);

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={onBlur}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 pr-10 text-sm outline-none focus:border-primary disabled:opacity-70"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-label={calendarLabel}
        aria-expanded={shown}
        aria-haspopup="dialog"
        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      {shown && (
        <div
          role="dialog"
          aria-label="Lịch chọn ngày"
          className={cn(
            "absolute top-[calc(100%+8px)] z-30 rounded-xl border border-border bg-popover p-1 shadow-lg",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          <Calendar
            mode="single"
            required
            selected={selected}
            defaultMonth={selected ?? minDate}
            locale={vi}
            disabled={minDate ? { before: minDate } : undefined}
            onSelect={(picked) => {
              if (!picked) return;
              onPick(picked);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
