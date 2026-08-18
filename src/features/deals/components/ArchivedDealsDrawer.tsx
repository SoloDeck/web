import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Archive, ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { getArchivedDeals } from "@/services/dealsService";
import { formatVND } from "@/utils/format";

/**
 * Kho lưu trữ — dự án hoàn thành đã đóng quá 90 ngày.
 *
 * Vì sao là NGĂN KÉO chứ không phải một tab hay một trang riêng: thêm tab thứ bảy hay thêm
 * route đều buộc phải vẽ lại Use Case Diagram và Screen Flow của báo cáo. Ngăn kéo mở ngay từ
 * chân cột "Hoàn Thành" — đúng chỗ người dùng đang nhìn khi thắc mắc "mấy dự án cũ đâu rồi".
 *
 * PHÂN TRANG THẬT, không tải hết: kho là thứ càng dùng lâu càng dài, tải hết là lặp lại đúng
 * cái sai mà cả đợt này đi sửa.  #Huynh
 */

const PAGE_SIZE = 10;

function formatClosedAt(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function ArchivedDealsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  // Gõ tới đâu bắn request tới đó là mỗi ký tự một lượt gọi. Chờ 350ms cho người ta gõ xong.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: ["deals", "archived", { page, title: debounced }],
    queryFn: () => getArchivedDeals({ page, pageSize: PAGE_SIZE, title: debounced }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const deals = query.data?.deals ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(query.data?.totalPages ?? 1, 1);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Đóng kho lưu trữ"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <aside
        role="dialog"
        aria-label="Kho lưu trữ dự án"
        className="relative flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Archive className="h-4 w-4" />
              </span>
              Kho lưu trữ
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Dự án hoàn thành đã đóng quá 90 ngày. Vẫn tính vào doanh thu, tỷ lệ thắng và mốc
              giá — chỉ là không nằm trên bảng nữa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-border px-5 py-3">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên dự án..."
              aria-label="Tìm dự án trong kho"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {query.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải kho...
            </div>
          ) : deals.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {debounced
                ? `Không có dự án nào khớp "${debounced}".`
                : "Chưa có dự án nào trong kho."}
            </div>
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate({ to: "/deals/$dealId", params: { dealId: deal.id } });
                  }}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-left transition hover:bg-secondary"
                >
                  <div className="text-sm font-semibold">{deal.projectType}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {deal.client} · đóng ngày {formatClosedAt(deal.closedAt)} ·{" "}
                    {formatVND(deal.value)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm">
          <span className="text-muted-foreground">
            {total} dự án · trang {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Trang trước"
              className="rounded-lg border border-border p-1.5 hover:bg-secondary disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Trang sau"
              className="rounded-lg border border-border p-1.5 hover:bg-secondary disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
