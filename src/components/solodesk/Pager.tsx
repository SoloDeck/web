import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { pageCount, pageRangeLabel } from "@/utils/paging";

/**
 * Thanh phân trang gọn: "3–7 / 24" kèm hai nút lùi/tiến.
 *
 * TỰ ẨN khi chỉ có một trang — thêm một thanh điều khiển vô dụng dưới danh sách 3 dòng chỉ làm
 * màn hình rối. Nút ở hai đầu bị khoá thay vì biến mất, để chiều rộng không nhảy khi bấm.
 */
export function Pager({
  page,
  total,
  pageSize,
  onPage,
  className,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  const soTrang = pageCount(total, pageSize);
  if (soTrang <= 1) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-border pt-3 text-sm",
        className
      )}
    >
      <span className="text-xs text-muted-foreground">
        {pageRangeLabel(page, total, pageSize)}
      </span>
      <div className="flex items-center gap-1">
        <NutTrang
          label="Trang trước"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          icon={<ChevronLeft className="size-4" />}
        />
        <span className="px-2 text-xs font-medium tabular-nums">
          {Math.min(page, soTrang)}/{soTrang}
        </span>
        <NutTrang
          label="Trang sau"
          disabled={page >= soTrang}
          onClick={() => onPage(page + 1)}
          icon={<ChevronRight className="size-4" />}
        />
      </div>
    </div>
  );
}

function NutTrang({
  label,
  disabled,
  onClick,
  icon,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-md border border-border transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {icon}
    </button>
  );
}
