import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Coins, Loader2, Receipt, RotateCcw, Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminErrorState,
  AdminLoadingState,
  EmptyState,
  MetricCard,
  PaginationFooter,
  PanelShell,
} from "@/features/admin/components/AdminDashboard";
import { useAdminPayments } from "@/features/admin/hooks/useAdmin";
import { cn } from "@/lib/utils";
import type {
  AdminPayment,
  AdminPaymentFilters,
  AdminPaymentProvider,
  AdminPaymentSortBy,
  AdminPaymentStatus,
} from "@/services/adminService";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: AdminPaymentStatus; label: string }[] = [
  { value: "pending", label: "Chờ thanh toán" },
  { value: "processing", label: "Đang xử lý" },
  { value: "succeeded", label: "Thành công" },
  { value: "failed", label: "Thất bại" },
  { value: "expired", label: "Hết hạn" },
  { value: "cancelled", label: "Đã huỷ" },
];

const PROVIDER_OPTIONS: { value: AdminPaymentProvider; label: string }[] = [
  { value: "momo", label: "MoMo" },
  { value: "bank_transfer", label: "Chuyển khoản" },
  { value: "vnpay", label: "VNPay" },
  { value: "manual", label: "Thủ công" },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((option) => [option.value, option.label]),
);

const PROVIDER_LABEL: Record<string, string> = Object.fromEntries(
  PROVIDER_OPTIONS.map((option) => [option.value, option.label]),
);

/**
 * Màu của một trạng thái nói trước cả chữ.
 *
 * Xanh = tiền đã về; đỏ = hỏng, cần nhìn; hổ phách = còn đang chạy, chưa kết luận được;
 * xám = đã đóng sổ mà không thu được đồng nào (hết hạn / khách tự huỷ) — chuyện bình
 * thường, không phải sự cố, nên không tô đỏ.  #Huynh
 */
const STATUS_TONE: Record<string, string> = {
  succeeded: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  pending: "bg-warning/15 text-warning-foreground",
  processing: "bg-warning/15 text-warning-foreground",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

/** Mỗi lựa chọn sắp xếp là một CẶP `sort_by` + `sort_order` mà backend hiểu được. */
const SORT_OPTIONS: {
  value: string;
  label: string;
  sortBy: AdminPaymentSortBy;
  sortOrder: "asc" | "desc";
}[] = [
  { value: "created_at:desc", label: "Mới tạo trước", sortBy: "created_at", sortOrder: "desc" },
  { value: "created_at:asc", label: "Cũ nhất trước", sortBy: "created_at", sortOrder: "asc" },
  { value: "paid_at:desc", label: "Mới thanh toán trước", sortBy: "paid_at", sortOrder: "desc" },
  { value: "amount:desc", label: "Số tiền cao → thấp", sortBy: "amount", sortOrder: "desc" },
  { value: "amount:asc", label: "Số tiền thấp → cao", sortBy: "amount", sortOrder: "asc" },
];

const ROW_GRID = "lg:grid-cols-[minmax(220px,1.5fr)_minmax(130px,1fr)_140px_150px_140px_150px]";

/**
 * Sổ giao dịch mua gói — CHỈ ĐỌC.
 *
 * Ai mua gói nào, lúc nào, bao nhiêu tiền, kết cục ra sao. Hợp đồng đã chốt là không có
 * hoàn tiền và không có xuất file ở màn này; thêm bằng cách gọi endpoint khác từ web là
 * đi vòng qua đúng chỗ đã thống nhất.
 *
 * Lọc, sắp xếp và phân trang đều làm ở MÁY CHỦ. Cắt mảng phía web chỉ đúng khi đã tải hết
 * bảng về — mà bảng giao dịch thì càng chạy càng dài, nên nó sai dần theo thời gian và sai
 * lặng lẽ: người xem thấy "137 giao dịch" nhưng chỉ lọc trong 20 dòng vừa tải.  #Huynh
 */
export function AdminPaymentTransactionsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminPaymentStatus | "all">("all");
  const [provider, setProvider] = useState<AdminPaymentProvider | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [page, setPage] = useState(1);

  /* Gõ tới đâu bắn request tới đó là mỗi chữ cái một lượt mạng. Chờ người ta ngừng gõ
     350ms rồi mới hỏi: gõ xong một email là đúng MỘT request, không phải hai mươi. */
  const debouncedSearch = useDebounced(search, 350);

  const sortChoice = SORT_OPTIONS.find((option) => option.value === sort) ?? SORT_OPTIONS[0];

  const filters: AdminPaymentFilters = useMemo(
    () => ({
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(status !== "all" ? { status } : {}),
      ...(provider !== "all" ? { provider } : {}),
      ...(fromDate ? { from_date: startOfDayIso(fromDate) } : {}),
      ...(toDate ? { to_date: endOfDayIso(toDate) } : {}),
      sort_by: sortChoice.sortBy,
      sort_order: sortChoice.sortOrder,
      page,
      page_size: PAGE_SIZE,
    }),
    [debouncedSearch, status, provider, fromDate, toDate, sortChoice, page],
  );

  const query = useAdminPayments(filters);

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstVisible = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastVisible = Math.min(page * PAGE_SIZE, total);

  const pageStats = summarisePage(rows);

  const hasFilters =
    search !== "" || status !== "all" || provider !== "all" || fromDate !== "" || toDate !== "";

  /**
   * Mọi lần đổi điều kiện đều kéo về trang 1.
   *
   * Giữ nguyên số trang thì rơi thẳng vào trang trống: bộ lọc mới có thể chỉ còn 2 trang
   * trong khi ta đang đứng ở trang 7 — bảng rỗng trông y hệt "không có dữ liệu". Việc này
   * làm NGAY trong hàm xử lý sự kiện, không phải trong `useEffect` theo dõi bộ lọc: đặt
   * state trong thân effect đẻ ra một lượt render thừa và bị `react-hooks` chặn.  #Huynh
   */
  function changeFilter(apply: () => void) {
    apply();
    setPage(1);
  }

  function resetFilters() {
    changeFilter(() => {
      setSearch("");
      setStatus("all");
      setProvider("all");
      setFromDate("");
      setToDate("");
      setSort(SORT_OPTIONS[0].value);
    });
  }

  /* Chỉ che màn ở lượt tải ĐẦU. `isFetching` của những lượt sau đã có `placeholderData`
     giữ bảng cũ trên màn hình, thay bằng khung chờ là làm bảng nhấp nháy mỗi lần lật trang. */
  if (query.isLoading && !query.data) return <AdminLoadingState />;
  if (query.isError) return <AdminErrorState onRefresh={() => query.refetch()} />;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          compact
          icon={Receipt}
          label="Giao dịch"
          value={total.toLocaleString("vi-VN")}
          hint={hasFilters ? "Khớp bộ lọc hiện tại" : "Toàn hệ thống"}
          tone="primary"
        />
        <MetricCard
          compact
          icon={Coins}
          label="Đã thu (trang này)"
          value={formatMoney(pageStats.collected, pageStats.currency)}
          hint="Chỉ cộng giao dịch thành công đang hiển thị"
          tone="success"
        />
        <MetricCard
          compact
          icon={CheckCircle2}
          label="Thành công (trang này)"
          value={String(pageStats.succeeded)}
          hint={`Trên ${rows.length} giao dịch đang hiển thị`}
          tone="default"
        />
        <MetricCard
          compact
          icon={Clock3}
          label="Đang chờ (trang này)"
          value={String(pageStats.pending)}
          hint="Chờ thanh toán hoặc đang xử lý"
          tone="warning"
        />
      </div>

      <PanelShell
        title="Giao dịch thanh toán"
        icon={Wallet}
        action={
          <div className="flex items-center gap-3">
            {query.isFetching && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Đang tải
              </span>
            )}
            <span className="text-xs font-semibold text-muted-foreground">
              {firstVisible}-{lastVisible} / {total} kết quả
            </span>
          </div>
        }
      >
        <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px] xl:grid-cols-[minmax(0,1fr)_160px_160px_190px]">
          <label className="relative">
            <span className="sr-only">Tìm theo tên hoặc email người mua</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => changeFilter(() => setSearch(event.target.value))}
              placeholder="Tìm theo tên hoặc email người mua"
              className="h-9 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <select
            value={status}
            onChange={(event) => changeFilter(() => setStatus(event.target.value as AdminPaymentStatus | "all"))}
            className="h-9 rounded-xl border border-input bg-background px-3 text-sm outline-none"
            aria-label="Lọc trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={provider}
            onChange={(event) => changeFilter(() => setProvider(event.target.value as AdminPaymentProvider | "all"))}
            className="h-9 rounded-xl border border-input bg-background px-3 text-sm outline-none"
            aria-label="Lọc kênh thanh toán"
          >
            <option value="all">Tất cả kênh</option>
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => changeFilter(() => setSort(event.target.value))}
            className="h-9 rounded-xl border border-input bg-background px-3 text-sm outline-none"
            aria-label="Sắp xếp"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-muted-foreground">Từ ngày</span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => changeFilter(() => setFromDate(event.target.value))}
              className="h-9 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-muted-foreground">Đến ngày</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => changeFilter(() => setToDate(event.target.value))}
              className="h-9 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {hasFilters && (
            <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="size-4" />
              Xoá bộ lọc
            </Button>
          )}
          <p className="ml-auto max-w-md text-xs text-muted-foreground">
            Khoảng ngày lọc theo <span className="font-semibold">lúc tạo giao dịch</span>, không
            phải lúc thanh toán — để các lượt chờ và thất bại vẫn nằm trong tầm nhìn.
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            text={
              hasFilters
                ? "Không có giao dịch nào khớp bộ lọc. Thử nới khoảng ngày hoặc bỏ bớt điều kiện."
                : "Chưa có giao dịch thanh toán nào được ghi nhận."
            }
          />
        ) : (
          <div className={cn("overflow-hidden rounded-xl border border-border bg-background", query.isFetching && "opacity-60 transition-opacity")}>
            <div
              className={cn(
                "hidden gap-3 border-b border-border bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid",
                ROW_GRID,
              )}
            >
              <div>Người mua</div>
              <div>Gói</div>
              <div className="text-right">Số tiền</div>
              <div>Kênh</div>
              <div>Trạng thái</div>
              <div className="text-right">Thời điểm</div>
            </div>
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <PaymentRow key={row.id} payment={row} />
              ))}
            </div>
          </div>
        )}

        {total > 0 && (
          <PaginationFooter
            currentPage={page}
            pageCount={pageCount}
            firstVisible={firstVisible}
            lastVisible={lastVisible}
            total={total}
            onPageChange={setPage}
            unit="giao dịch"
          />
        )}
      </PanelShell>
    </div>
  );
}

function PaymentRow({ payment }: { payment: AdminPayment }) {
  /* Ba trường này đến từ LEFT OUTER JOIN nên có thể null — user hoặc gói đã bị xoá. Rơi
     xuống email, rồi xuống mã người dùng rút gọn: vẫn tra ngược được, hơn hẳn một ô trống. */
  const name = payment.user_full_name ?? payment.user_email ?? shortId(payment.user_id);
  const sub = payment.user_full_name && payment.user_email ? payment.user_email : null;

  return (
    <div className={cn("grid gap-1.5 px-4 py-3 text-sm lg:items-center lg:gap-3", ROW_GRID)}>
      <div className="min-w-0">
        <div className="truncate font-medium" title={name}>
          {name}
        </div>
        {sub && (
          <div className="truncate text-xs text-muted-foreground" title={sub}>
            {sub}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <span className="lg:hidden text-xs text-muted-foreground">Gói: </span>
        <span className="truncate" title={payment.plan_name ?? undefined}>
          {payment.plan_name ?? "—"}
        </span>
      </div>

      <div className="font-semibold tabular-nums lg:text-right">
        {formatMoney(payment.amount, payment.currency)}
      </div>

      <div className="min-w-0">
        <div className="text-sm">{PROVIDER_LABEL[payment.provider] ?? payment.provider}</div>
        {payment.provider_reference && (
          <div
            className="truncate font-mono text-[11px] text-muted-foreground"
            title={payment.provider_reference}
          >
            {payment.provider_reference}
          </div>
        )}
      </div>

      <div>
        <StatusBadge status={payment.status} />
      </div>

      <div className="text-xs text-muted-foreground lg:text-right">
        <div title={`Tạo lúc ${formatDateTime(payment.created_at)}`}>
          {formatDateTime(payment.created_at)}
        </div>
        {payment.paid_at && (
          <div className="text-success" title={`Thanh toán lúc ${formatDateTime(payment.paid_at)}`}>
            TT: {formatDateTime(payment.paid_at)}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-1 text-xs font-semibold",
        STATUS_TONE[status] ?? "bg-secondary text-muted-foreground",
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * `amount` về dạng CHUỖI (`"199000.00"`) vì pydantic tuần tự hoá `Decimal` như vậy.
 * `Number(...)` trước khi cộng hay định dạng; cộng thẳng chuỗi thì "1" + "2" = "12".
 */
function toAmount(value: string | number): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: string | number, currency: string): string {
  const amount = toAmount(value);
  const code = currency || "VND";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: code === "VND" ? 0 : 2,
    }).format(amount);
  } catch {
    // Mã tiền tệ lạ thì `Intl` ném lỗi — vẫn phải hiện được con số, đừng để trắng ô.
    return `${amount.toLocaleString("vi-VN")} ${code}`;
  }
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `<input type="date">` cho ra "2026-08-20"; backend cần ISO 8601 có giờ. */
function startOfDayIso(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}

function endOfDayIso(value: string): string {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function shortId(id: string): string {
  return `#${id.slice(0, 8)}`;
}

/**
 * Thống kê của RIÊNG trang đang xem.
 *
 * Cố ý không gọi là "tổng doanh thu": máy chủ chỉ trả về 20 dòng, cộng chúng lại rồi gắn
 * nhãn tổng là nói dối bằng một con số trông rất thật. Nhãn ở thẻ ghi rõ "(trang này)".
 */
function summarisePage(rows: AdminPayment[]) {
  let collected = 0;
  let succeeded = 0;
  let pending = 0;
  for (const row of rows) {
    if (row.status === "succeeded") {
      collected += toAmount(row.amount);
      succeeded += 1;
    } else if (row.status === "pending" || row.status === "processing") {
      pending += 1;
    }
  }
  return { collected, succeeded, pending, currency: rows[0]?.currency ?? "VND" };
}
