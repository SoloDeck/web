import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Archive, ChevronLeft, ChevronRight, Loader2, Search, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useArchiveCounts } from "@/features/deals/hooks/useArchiveCounts";
import { useDeleteDeal } from "@/features/deals/hooks/useDeals";
import type { Deal } from "@/features/deals/types";
import { getArchivedDeals, getLostDeals } from "@/services/dealsService";
import { formatVND } from "@/utils/format";

/**
 * Kho lưu trữ — nơi những dự án không còn nằm trên bảng, chia hai mục:
 *  - Đã hoàn thành: dự án hoàn thành đã đóng quá 90 ngày. Vẫn tính vào doanh thu và tỷ lệ thắng.
 *  - Không thành công: dự án đã "Loại bỏ" kèm lý do. Đây là mục DUY NHẤT cho phép xóa vĩnh viễn.
 *
 * Vì sao là NGĂN KÉO chứ không phải một tab hay một trang riêng: thêm tab thứ bảy hay thêm
 * route đều buộc phải vẽ lại Use Case Diagram và Screen Flow của báo cáo. Ngăn kéo mở ngay từ
 * chân cột "Hoàn Thành" — đúng chỗ người dùng đang nhìn khi thắc mắc "mấy dự án cũ đâu rồi".
 *
 * PHÂN TRANG THẬT, không tải hết: kho là thứ càng dùng lâu càng dài, tải hết là lặp lại đúng
 * cái sai mà cả đợt này đi sửa.  #Huynh
 */

type ArchiveTab = "completed" | "lost";

const PAGE_SIZE = 10;

const TAB_TEXT: Record<ArchiveTab, { intro: string; closedLabel: string; empty: string }> = {
  completed: {
    intro: "Các dự án hoàn thành",
    closedLabel: "đóng ngày",
    empty: "Chưa có dự án nào trong kho.",
  },
  lost: {
    intro: "Các dự án bị loại bỏ",
    closedLabel: "loại bỏ ngày",
    empty: "Chưa có dự án nào không thành công.",
  },
};

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

function CountBadge({ value }: { value?: number }) {
  if (value === undefined) return null;
  return (
    <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">
      {value}
    </span>
  );
}

export function ArchivedDealsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Đóng thì gỡ hẳn phần thân: lần mở sau bắt đầu lại từ trang 1, ô tìm trống, và mục mặc định
  // được tính lại từ số liệu mới nhất. Cũng nhờ vậy kho chỉ tải khi mở ra.
  if (!open) return null;
  return <ArchiveDrawerBody onClose={onClose} />;
}

function ArchiveDrawerBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const counts = useArchiveCounts();
  const deleteDeal = useDeleteDeal();
  const [pickedTab, setPickedTab] = useState<ArchiveTab | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  // Dự án đang chờ xác nhận xóa. Giữ lại sau khi đóng hộp thoại để chữ trong hộp không trống đi
  // giữa lúc nó đang mờ dần.
  const [target, setTarget] = useState<Deal | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Chưa chọn mục nào thì mở vào mục CÓ dự án: kho chỉ toàn dự án không thành công mà mở vào mục
  // "Đã hoàn thành" trống trơn sẽ trông như kho rỗng.
  const tab: ArchiveTab =
    pickedTab ?? (counts.completed === 0 && (counts.lost ?? 0) > 0 ? "lost" : "completed");
  const text = TAB_TEXT[tab];

  // Gõ tới đâu bắn request tới đó là mỗi ký tự một lượt gọi. Chờ 350ms cho người ta gõ xong.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: ["deals", tab === "lost" ? "lost" : "archived", { page, title: debounced }],
    queryFn: () =>
      tab === "lost"
        ? getLostDeals({ page, pageSize: PAGE_SIZE, title: debounced })
        : getArchivedDeals({ page, pageSize: PAGE_SIZE, title: debounced }),
  });

  // Esc khi đang hỏi xóa thì CHỈ đóng hộp hỏi: hộp thoại của Base UI tự dừng lan truyền phím Esc
  // nên nó không tới được đây. Không cần chốt chặn riêng — có test giữ đúng điều này.
  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const deals = query.data?.deals ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(query.data?.totalPages ?? 1, 1);

  function selectTab(next: ArchiveTab) {
    if (next === tab) return;
    setPickedTab(next);
    setPage(1);
  }

  function openDeal(deal: Deal) {
    onClose();
    navigate({ to: "/deals/$dealId", params: { dealId: deal.id } });
  }

  function askDelete(deal: Deal) {
    setTarget(deal);
    setConfirmOpen(true);
  }

  function confirmDelete() {
    if (!target) return;
    deleteDeal.mutate(target.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        // Xóa dòng cuối của trang cuối thì lùi một trang, kẻo đứng lại ở một trang trống.
        if (deals.length === 1 && page > 1) setPage(page - 1);
      },
    });
  }

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
            <p className="mt-1.5 text-sm text-muted-foreground">{text.intro}</p>
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

        <Tabs
          value={tab}
          onValueChange={(value) => selectTab(value as ArchiveTab)}
          className="min-h-0 flex-1 gap-0"
        >
          <TabsList variant="line" className="w-full shrink-0 justify-start border-b border-border px-5">
            <TabsTrigger value="completed" className="flex-none px-3">
              Đã hoàn thành
              <CountBadge value={counts.completed} />
            </TabsTrigger>
            <TabsTrigger value="lost" className="flex-none px-3">
              Không thành công
              <CountBadge value={counts.lost} />
            </TabsTrigger>
          </TabsList>

          <div className="shrink-0 border-b border-border px-5 py-3">
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

          <TabsContent value={tab} className="min-h-0 flex-1 overflow-y-auto p-5">
            {query.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải kho...
              </div>
            ) : deals.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {debounced ? `Không có dự án nào khớp "${debounced}".` : text.empty}
              </div>
            ) : (
              <div className="space-y-2">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-stretch overflow-hidden rounded-lg border border-border transition hover:bg-secondary"
                  >
                    <button
                      type="button"
                      onClick={() => openDeal(deal)}
                      className="min-w-0 flex-1 px-3 py-2.5 text-left"
                    >
                      <div className="text-sm font-semibold">{deal.projectType}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {deal.client} · {text.closedLabel} {formatClosedAt(deal.closedAt)} ·{" "}
                        {formatVND(deal.value)}
                      </div>
                      {tab === "lost" && (
                        <div className="mt-1.5 text-xs">
                          <span className="font-semibold text-destructive">Lý do: </span>
                          {deal.lostReason ? (
                            <span>{deal.lostReason}</span>
                          ) : (
                            <span className="italic text-muted-foreground">Chưa ghi lý do</span>
                          )}
                        </div>
                      )}
                    </button>
                    {tab === "lost" && (
                      <button
                        type="button"
                        onClick={() => askDelete(deal)}
                        aria-label={`Xóa vĩnh viễn dự án ${deal.projectType}`}
                        title="Xóa vĩnh viễn"
                        className="grid w-11 shrink-0 place-items-center border-l border-border text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm">
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
        </Tabs>
      </aside>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Xóa vĩnh viễn dự án?"
        description={
          target
            ? `Dự án "${target.projectType}" sẽ bị xóa hẳn và không khôi phục được. Dự án cũng không còn được tính vào tỷ lệ thắng và các số liệu thu tiền.`
            : undefined
        }
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Giữ lại"
        tone="danger"
        isLoading={deleteDeal.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
