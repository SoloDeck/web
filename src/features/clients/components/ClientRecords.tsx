import { useEffect, useMemo, useState } from "react";
import {
  Search, Phone, Mail, Globe, MapPin, Building2, User,
  Construction, Loader2, MessageCircle, LayoutList, LayoutGrid,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatVND } from "@/utils/format";
import { getClients, type ClientRecord, type ClientStatus } from "@/services/clientsService";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import type { Deal } from "@/features/deals/types";

// ── Shared helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ClientStatus, { label: string; cls: string }> = {
  prospect:  { label: "Tiềm năng",       cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  active:    { label: "Đang hoạt động",  cls: "bg-success/15 text-success" },
  inactive:  { label: "Không hoạt động", cls: "bg-muted text-muted-foreground" },
  archived:  { label: "Lưu trữ",         cls: "bg-destructive/10 text-destructive" },
};

function StatusBadge({ status }: { status: ClientStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <span className={`inline-flex text-[10px] font-semibold rounded-full px-2 py-0.5 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function DevBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      <Construction className="h-2.5 w-2.5" /> Đang phát triển
    </span>
  );
}

function Avatar({ name, type, size = "md" }: { name: string; type: ClientRecord["type"]; size?: "sm" | "md" }) {
  const initial = name.trim().charAt(0).toUpperCase();
  const sz = size === "sm" ? "h-7 w-7 text-xs" : "h-10 w-10 text-sm";
  return (
    <div className={`${sz} rounded-full grid place-items-center shrink-0 font-bold text-white ${type === "company" ? "bg-violet-500" : "bg-primary"}`}>
      {initial}
    </div>
  );
}

// ── Pagination bar ────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function PaginationBar({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
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
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {withGaps.map((p, i) =>
          p === "…" ? (
            <span key={`g${i}`} className="px-1.5 text-xs text-muted-foreground">…</span>
          ) : (
            <button key={p} onClick={() => onPage(p as number)}
              className={`min-w-[32px] h-8 rounded-md text-xs font-medium transition-colors ${p === page ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"}`}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          className="p-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function TableRow({ client, clientDeals, onOpenDeal }: { client: ClientRecord; clientDeals: Deal[]; onOpenDeal: (d: Deal) => void }) {
  const totalValue = clientDeals.reduce((s, d) => s + d.value, 0);
  const phone    = client.contact_info?.phone ?? null;
  const firstDeal = clientDeals[0] ?? null;
  const tags     = client.tags ?? [];

  return (
    <tr className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={client.name} type={client.type} size="sm" />
          <div className="min-w-0">
            <div className="font-medium text-sm truncate max-w-[180px]">{client.name}</div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
              {client.type === "company" ? <><Building2 className="h-2.5 w-2.5" />Công ty</> : <><User className="h-2.5 w-2.5" />Cá nhân</>}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3"><StatusBadge status={client.status} /></td>
      <td className="px-3 py-3">
        <div className="space-y-0.5">
          {phone && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3 shrink-0" />{phone}</div>}
          {client.email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate max-w-[160px]">{client.email}</span></div>}
          {!phone && !client.email && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      </td>
      <td className="px-3 py-3">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => <span key={t} className="text-[10px] rounded-full bg-secondary text-secondary-foreground px-2 py-0.5">{t}</span>)}
            {tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>}
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-3 text-right">
        {clientDeals.length > 0 ? (
          <div>
            <div className="text-xs font-semibold text-primary">{formatVND(totalValue)}</div>
            <div className="text-[10px] text-muted-foreground">{clientDeals.length} dự án</div>
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="px-3 py-3"><DevBadge /></td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          {firstDeal && <button onClick={() => onOpenDeal(firstDeal)} className="rounded-md bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold hover:bg-primary/20">Xem dự án</button>}
          <button className="rounded-md bg-success/10 text-success px-2.5 py-1 text-xs font-semibold hover:bg-success/20 inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> Zalo
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ClientCard({ client, clientDeals, onOpenDeal }: { client: ClientRecord; clientDeals: Deal[]; onOpenDeal: (d: Deal) => void }) {
  const totalValue = clientDeals.reduce((s, d) => s + d.value, 0);
  const phone    = client.contact_info?.phone ?? null;
  const firstDeal = clientDeals[0] ?? null;
  const tags     = client.tags ?? [];

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar name={client.name} type={client.type} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{client.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              {client.type === "company" ? <><Building2 className="h-2.5 w-2.5" />Công ty</> : <><User className="h-2.5 w-2.5" />Cá nhân</>}
            </span>
            <span className="text-muted-foreground text-[10px]">·</span>
            <StatusBadge status={client.status} />
          </div>
        </div>
      </div>
      <div className="space-y-1">
        {phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /><span className="truncate">{phone}</span></div>}
        {client.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{client.email}</span></div>}
        {client.contact_info?.address_city && <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{client.contact_info.address_city}</span></div>}
        {client.contact_info?.website && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Globe className="h-3 w-3 shrink-0" /><span className="truncate">{client.contact_info.website}</span></div>}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => <span key={tag} className="text-[10px] rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 font-medium">{tag}</span>)}
        </div>
      )}
      <div className="border-t border-dashed border-border" />
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {clientDeals.length > 0
            ? <span><span className="font-semibold text-foreground">{clientDeals.length}</span> dự án{totalValue > 0 && <> · <span className="font-semibold text-primary">{formatVND(totalValue)}</span></>}</span>
            : <span>Chưa có dự án</span>}
        </div>
        <DevBadge />
      </div>
      <div className="flex gap-2">
        {firstDeal && <button onClick={() => onOpenDeal(firstDeal)} className="flex-1 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-colors">Xem dự án</button>}
        <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-success/10 text-success px-3 py-1.5 text-xs font-semibold hover:bg-success/20 transition-colors">
          <MessageCircle className="h-3.5 w-3.5" /> Nhắn Zalo
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Filter = "all" | "active" | "prospect" | "inactive";
type ViewMode = "table" | "card";

const FILTERS: { id: Filter; label: string }[] = [
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
  const [filter, setFilter]         = useState<Filter>("all");
  const [page, setPage]             = useState(1);
  const [view, setView]             = useState<ViewMode>("table");

  useEffect(() => {
    getClients()
      .then(setAllClients)
      .catch(() => toast.error("Không thể tải danh sách khách hàng."))
      .finally(() => setLoading(false));
  }, []);

  const dealsByClientId = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const d of deals) {
      const arr = map.get(d.clientId) ?? [];
      arr.push(d);
      map.set(d.clientId, arr);
    }
    return map;
  }, [deals]);

  // Client-side filter (until BE adds search/status params)
  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    return allClients.filter((c) => {
      const matchesQ = !q
        || c.name.toLowerCase().includes(lq)
        || (c.email ?? "").toLowerCase().includes(lq)
        || (c.contact_info?.phone ?? "").includes(q);
      const matchesF =
        filter === "all"      ? true :
        filter === "active"   ? c.status === "active" :
        filter === "prospect" ? c.status === "prospect" :
                                c.status === "inactive";
      return matchesQ && matchesF;
    });
  }, [allClients, q, filter]);

  // Reset page when filter/search changes
  const handleQ      = (v: string) => { setQ(v);      setPage(1); };
  const handleFilter = (v: Filter) => { setFilter(v); setPage(1); };

  // Client-side pagination
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const stats = useMemo(() => ({
    total:    allClients.length,
    active:   allClients.filter((c) => c.status === "active").length,
    prospect: allClients.filter((c) => c.status === "prospect").length,
  }), [allClients]);

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <span className="font-semibold">{stats.total} khách hàng</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{stats.active} đang hoạt động</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{stats.prospect} tiềm năng</span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input value={q} onChange={(e) => handleQ(e.target.value)}
            placeholder="Tìm tên, email, số điện thoại..."
            className="bg-transparent text-sm flex-1 outline-none" />
        </div>
        <div className="flex items-center gap-1 flex-wrap text-xs">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => handleFilter(f.id)}
              className={`px-3 py-1.5 rounded-md transition-colors ${filter === f.id ? "bg-primary text-primary-foreground font-semibold" : "border border-border hover:bg-secondary"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView("table")} title="Dạng bảng"
            className={`p-2 transition-colors ${view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"}`}>
            <LayoutList className="h-4 w-4" />
          </button>
          <button onClick={() => setView("card")} title="Dạng thẻ"
            className={`p-2 transition-colors ${view === "card" ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-muted-foreground"}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 grid place-items-center text-muted-foreground">
          <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
          {allClients.length === 0
            ? 'Chưa có khách hàng nào. Nhấn "Thêm dự án mới" để tạo.'
            : "Không tìm thấy khách hàng phù hợp."}
        </div>
      ) : view === "table" ? (
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          <div className="flex-1 overflow-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-4 py-2.5">Khách hàng</th>
                  <th className="text-left font-semibold px-3 py-2.5">Trạng thái</th>
                  <th className="text-left font-semibold px-3 py-2.5">Liên hệ</th>
                  <th className="text-left font-semibold px-3 py-2.5">Tags</th>
                  <th className="text-right font-semibold px-3 py-2.5">Dự án</th>
                  <th className="text-left font-semibold px-3 py-2.5">Lịch sử</th>
                  <th className="px-3 py-2.5 w-[140px]"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((client) => (
                  <TableRow key={client.id} client={client}
                    clientDeals={dealsByClientId.get(client.id) ?? []}
                    onOpenDeal={onOpenDeal} />
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar total={filtered.length} page={page} onPage={setPage} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginated.map((client) => (
                <ClientCard key={client.id} client={client}
                  clientDeals={dealsByClientId.get(client.id) ?? []}
                  onOpenDeal={onOpenDeal} />
              ))}
            </div>
          </div>
          <PaginationBar total={filtered.length} page={page} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
