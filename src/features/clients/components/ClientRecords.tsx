/**
 * ClientRecords.tsx
 *
 * Trang Hồ Sơ Khách Hàng — hiển thị danh sách clients với:
 *   - Tìm kiếm theo tên / email / số điện thoại (client-side)
 *   - Lọc theo trạng thái (prospect / active / inactive)
 *   - Chế độ xem bảng và thẻ
 *   - Phân trang (20 mục/trang)
 *   - Nút "Xem chi tiết" mở ClientDetailSheet (deals + comm-logs)
 *
 * Dữ liệu: GET /clients (flat fields theo ClientResponse của backend)
 */

import { useEffect, useMemo, useState } from "react";
import {
  Search, Phone, Mail, Loader2,
  LayoutList, LayoutGrid, ChevronLeft, ChevronRight,
  Building2, User, ExternalLink, Briefcase, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { formatVND } from "@/utils/format";
import { getClients, type ClientRecord, type ClientStatus } from "@/services/clientsService";
import { ClientDetailSheet } from "./ClientDetailSheet";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import type { Deal } from "@/features/deals/types";

// ── Badge trạng thái ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ClientStatus, { label: string; cls: string }> = {
  prospect: { label: "Tiềm năng",       cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  active:   { label: "Đang hoạt động",  cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  inactive: { label: "Không hoạt động", cls: "bg-muted text-muted-foreground" },
  archived: { label: "Lưu trữ",         cls: "bg-destructive/10 text-destructive" },
};

function StatusBadge({ status }: { status: ClientStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <span className={`inline-flex text-[10px] font-semibold rounded-full px-2 py-0.5 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/** Avatar chữ cái đầu */
function Avatar({
  name, type, size = "md",
}: {
  name: string; type: ClientRecord["type"]; size?: "sm" | "md";
}) {
  const initial = name.trim().charAt(0).toUpperCase();
  const sz = size === "sm" ? "h-7 w-7 text-xs" : "h-10 w-10 text-sm";
  return (
    <div className={`${sz} rounded-full grid place-items-center shrink-0 font-bold text-white ${type === "company" ? "bg-violet-500" : "bg-primary"}`}>
      {initial}
    </div>
  );
}

// ── Phân trang ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function PaginationBar({
  total, page, onPage,
}: {
  total: number; page: number; onPage: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;

  const from = (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  const withGaps: (number | "…")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) withGaps.push("…");
    withGaps.push(p);
    prev = p;
  }

  return (
    <div className="flex items-center justify-between gap-4 pt-2 flex-wrap shrink-0">
      <span className="text-xs text-muted-foreground">
        Hiển thị <span className="font-medium text-foreground">{from}–{to}</span> / {total} khách hàng
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {withGaps.map((p, i) =>
          p === "…" ? (
            <span key={`g${i}`} className="px-1.5 text-xs text-muted-foreground">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`min-w-[32px] h-8 rounded-md text-xs font-medium transition-colors ${p === page ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"}`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  if (h < 24) return `${h} giờ trước`;
  if (d < 7)  return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// ── Hàng bảng ─────────────────────────────────────────────────────────────────

type RowProps = {
  client:      ClientRecord;
  clientDeals: Deal[];
  onViewDetail: (c: ClientRecord) => void;
};

function TableRow({ client, clientDeals, onViewDetail }: RowProps) {
  const sortedDeals = [...clientDeals].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const latestDeal = sortedDeals[0] ?? null;
  const lastInteraction = latestDeal?.updatedAt ?? client.updated_at;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
      {/* Khách hàng: avatar + tên + loại + trạng thái */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={client.name} type={client.type} size="sm" />
          <div className="min-w-0">
            <div className="font-medium text-sm truncate max-w-[160px]">{client.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                {client.type === "company"
                  ? <><Building2 className="h-2.5 w-2.5" />Công ty</>
                  : <><User className="h-2.5 w-2.5" />Cá nhân</>}
              </span>
              <StatusBadge status={client.status} />
            </div>
          </div>
        </div>
      </td>

      {/* Liên hệ */}
      <td className="px-3 py-3">
        <div className="space-y-0.5">
          {client.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />{client.phone}
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[150px]">{client.email}</span>
            </div>
          )}
          {!client.phone && !client.email && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </td>

      {/* Dự án: số lần hợp tác */}
      <td className="px-3 py-3 text-center">
        {clientDeals.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <Briefcase className="h-3 w-3" />
            {clientDeals.length}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Dự án gần nhất */}
      <td className="px-3 py-3">
        {latestDeal ? (
          <span className="text-xs text-foreground truncate block max-w-[160px]">
            {latestDeal.projectType}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Tương tác gần nhất */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <Clock className="h-3 w-3 shrink-0" />
          {relativeTime(lastInteraction)}
        </div>
      </td>

      {/* Xem chi tiết — luôn hiển thị */}
      <td className="px-3 py-3">
        <div className="flex items-center justify-end">
          <button
            onClick={() => onViewDetail(client)}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold hover:bg-primary/20 transition-colors"
          >
            <ExternalLink className="h-3 w-3" /> Xem chi tiết
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Thẻ card ──────────────────────────────────────────────────────────────────

type CardProps = {
  client:       ClientRecord;
  clientDeals:  Deal[];
  onViewDetail: (c: ClientRecord) => void;
};

function ClientCard({ client, clientDeals, onViewDetail }: CardProps) {
  const totalValue = clientDeals.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar name={client.name} type={client.type} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{client.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              {client.type === "company"
                ? <><Building2 className="h-2.5 w-2.5" />Công ty</>
                : <><User className="h-2.5 w-2.5" />Cá nhân</>}
            </span>
            <span className="text-muted-foreground text-[10px]">·</span>
            <StatusBadge status={client.status} />
          </div>
        </div>
      </div>

      {/* Liên hệ */}
      <div className="space-y-1">
        {client.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" /><span className="truncate">{client.phone}</span>
          </div>
        )}
        {client.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{client.email}</span>
          </div>
        )}
        {/* Mô tả ngắn nếu có */}
        {client.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 italic">
            {client.description}
          </p>
        )}
      </div>

      {/* Footer: deal summary + action */}
      <div className="border-t border-dashed border-border pt-3 flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {clientDeals.length > 0 ? (
            <span>
              <span className="font-semibold text-foreground">{clientDeals.length}</span> dự án
              {totalValue > 0 && (
                <> · <span className="font-semibold text-primary">{formatVND(totalValue)}</span></>
              )}
            </span>
          ) : (
            <span>Chưa có dự án</span>
          )}
        </div>
        <button
          onClick={() => onViewDetail(client)}
          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-2.5 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-colors"
        >
          <ExternalLink className="h-3 w-3" /> Xem chi tiết
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type FilterKey = "all" | "active" | "prospect" | "inactive";
type ViewMode  = "table" | "card";

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: "all",      label: "Tất cả" },
  { id: "active",   label: "Đang hoạt động" },
  { id: "prospect", label: "Tiềm năng" },
  { id: "inactive", label: "Không hoạt động" },
];

export function ClientRecords({ onOpenDeal }: { onOpenDeal: (d: Deal) => void }) {
  const deals = useDealStore((s) => s.deals);

  const [allClients, setAllClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [q, setQ]                   = useState("");
  const [filter, setFilter]         = useState<FilterKey>("all");
  const [page, setPage]             = useState(1);
  const [view, setView]             = useState<ViewMode>("table");
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);

  // Tải danh sách khách hàng khi mount
  useEffect(() => {
    getClients()
      .then(setAllClients)
      .catch(() => toast.error("Không thể tải danh sách khách hàng."))
      .finally(() => setLoading(false));
  }, []);

  // Khi tạo client mới, cập nhật lại danh sách từ ngoài (qua key reset)
  const handleClientCreated = (newClient: ClientRecord) => {
    setAllClients((prev) => [newClient, ...prev]);
  };
  void handleClientCreated; // suppress unused warning — dùng từ parent qua key

  // ── Map deal theo clientId để tính nhanh ──────────────────────────────────

  const dealsByClientId = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const d of deals) {
      const arr = map.get(d.clientId) ?? [];
      arr.push(d);
      map.set(d.clientId, arr);
    }
    return map;
  }, [deals]);

  // ── Lọc và tìm kiếm client-side ──────────────────────────────────────────

  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    return allClients.filter((c) => {
      // Tìm theo tên, email, phone
      const matchQ =
        !q ||
        c.name.toLowerCase().includes(lq) ||
        (c.email ?? "").toLowerCase().includes(lq) ||
        (c.phone ?? "").includes(q);

      // Lọc theo tab trạng thái
      const matchF =
        filter === "all"      ? true :
        filter === "active"   ? c.status === "active" :
        filter === "prospect" ? c.status === "prospect" :
                                c.status === "inactive";

      return matchQ && matchF;
    });
  }, [allClients, q, filter]);

  const handleQ      = (v: string) => { setQ(v);      setPage(1); };
  const handleFilter = (v: FilterKey) => { setFilter(v); setPage(1); };

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const stats = useMemo(() => ({
    total:    allClients.length,
    active:   allClients.filter((c) => c.status === "active").length,
    prospect: allClients.filter((c) => c.status === "prospect").length,
  }), [allClients]);

  // Mở deal và điều hướng sang Kanban (từ parent callback)
  const handleOpenDeal = (deal: Deal) => {
    setSelectedClient(null); // đóng sheet trước
    onOpenDeal(deal);
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col gap-4">

      {/* Thống kê nhanh */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <span className="font-semibold">{stats.total} khách hàng</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{stats.active} đang hoạt động</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{stats.prospect} tiềm năng</span>
      </div>

      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Ô tìm kiếm */}
        <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => handleQ(e.target.value)}
            placeholder="Tìm tên, email, số điện thoại..."
            className="bg-transparent text-sm flex-1 outline-none"
          />
        </div>

        {/* Tabs lọc trạng thái */}
        <div className="flex items-center gap-1 flex-wrap text-xs">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => handleFilter(f.id)}
              className={`px-3 py-1.5 rounded-md transition-colors ${filter === f.id ? "bg-primary text-primary-foreground font-semibold" : "border border-border hover:bg-secondary"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Toggle bảng / thẻ */}
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setView("table")}
            title="Dạng bảng"
            className={`p-2 transition-colors ${view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"}`}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("card")}
            title="Dạng thẻ"
            className={`p-2 transition-colors ${view === "card" ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Nội dung chính */}
      {loading ? (
        <div className="flex-1 grid place-items-center text-muted-foreground">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
          {allClients.length === 0
            ? 'Chưa có khách hàng nào. Nhấn "Khách hàng mới" để tạo.'
            : "Không tìm thấy khách hàng phù hợp."}
        </div>
      ) : view === "table" ? (
        /* ── Chế độ bảng ── */
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          <div className="flex-1 overflow-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">Khách hàng</th>
                  <th className="text-left font-semibold px-3 py-2.5">Liên hệ</th>
                  <th className="text-center font-semibold px-3 py-2.5">Dự án</th>
                  <th className="text-left font-semibold px-3 py-2.5">Dự án gần nhất</th>
                  <th className="text-left font-semibold px-3 py-2.5">Tương tác</th>
                  <th className="px-3 py-2.5 w-[130px]"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((client) => (
                  <TableRow
                    key={client.id}
                    client={client}
                    clientDeals={dealsByClientId.get(client.id) ?? []}
                    onViewDetail={setSelectedClient}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar total={filtered.length} page={page} onPage={setPage} />
        </div>
      ) : (
        /* ── Chế độ thẻ ── */
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginated.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  clientDeals={dealsByClientId.get(client.id) ?? []}
                  onViewDetail={setSelectedClient}
                />
              ))}
            </div>
          </div>
          <PaginationBar total={filtered.length} page={page} onPage={setPage} />
        </div>
      )}

      {/* Sheet chi tiết khách hàng */}
      <ClientDetailSheet
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onOpenDeal={handleOpenDeal}
      />
    </div>
  );
}
