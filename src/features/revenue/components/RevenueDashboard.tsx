import { useEffect, useState } from "react";
import {
  TrendingUp, Wallet, FileText, AlertCircle,
  CheckCircle2, Clock, XCircle, FilePenLine, Send, Ban,
} from "lucide-react";
import { formatVND } from "@/utils/format";
import { getContracts, type Contract } from "@/services/contractsService";
import { getInvoices, getAnalyticsDashboard, type Invoice, type AnalyticsDashboard } from "@/services/invoicesService";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONTRACT_STATUS: Record<string, { label: string; cls: string }> = {
  draft:                { label: "Bản nháp",        cls: "bg-secondary text-muted-foreground" },
  pending_signatures:   { label: "Chờ ký",          cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  active:               { label: "Hiệu lực",        cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  completed:            { label: "Hoàn thành",      cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  terminated:           { label: "Đã huỷ",          cls: "bg-destructive/10 text-destructive" },
};

const INVOICE_STATUS: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  draft:     { label: "Bản nháp",     icon: FilePenLine,   cls: "bg-secondary text-muted-foreground" },
  sent:      { label: "Đã gửi",       icon: Send,          cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  paid:      { label: "Đã thanh toán",icon: CheckCircle2,  cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  overdue:   { label: "Quá hạn",      icon: AlertCircle,   cls: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Đã huỷ",       icon: Ban,           cls: "bg-secondary text-muted-foreground" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RevenueDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAnalyticsDashboard(),
      getContracts(),
      getInvoices(),
    ]).then(([a, c, i]) => {
      setAnalytics(a);
      setContracts(c);
      setInvoices(i);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Đang tải...
      </div>
    );
  }

  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const paidRevenue     = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const remaining       = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled")
                                  .reduce((s, i) => s + (i.total - i.amount_paid), 0);

  return (
    <div className="p-4 lg:p-6 h-full overflow-y-auto space-y-6">

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={Wallet}
          label="Doanh thu thực thu"
          value={formatVND(analytics?.total_revenue ?? paidRevenue)}
          tone="primary"
        />
        <MetricCard
          icon={Clock}
          label="Còn phải thu"
          value={formatVND(remaining)}
          hint={`${analytics?.pending_invoices ?? overdueInvoices.length} hoá đơn chưa xong`}
          tone="warning"
        />
        <MetricCard
          icon={FileText}
          label="Hợp đồng"
          value={String(contracts.length)}
          hint={`${contracts.filter((c) => c.status === "active").length} đang hiệu lực`}
          tone="success"
        />
        <MetricCard
          icon={TrendingUp}
          label="Dự án đang chạy"
          value={String(analytics?.active_deals ?? 0)}
          tone="default"
        />
      </div>

      {/* ── Invoices ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Hoá đơn
          </h2>
          <span className="text-xs text-muted-foreground">{invoices.length} mục</span>
        </div>

        {invoices.length === 0 ? (
          <EmptyState text="Chưa có hoá đơn nào." />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Số HĐ</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Hạn thanh toán</th>
                  <th className="text-right px-4 py-2.5 font-medium">Tổng</th>
                  <th className="text-right px-4 py-2.5 font-medium hidden md:table-cell">Đã trả</th>
                  <th className="text-center px-4 py-2.5 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => {
                  const st = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.draft;
                  const StatusIcon = st.icon;
                  return (
                    <tr key={inv.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{fmtDate(inv.due_date)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatVND(inv.total)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{formatVND(inv.amount_paid)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                          <StatusIcon className="h-3 w-3" />
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Contracts ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FilePenLine className="h-4 w-4 text-primary" /> Hợp đồng
          </h2>
          <span className="text-xs text-muted-foreground">{contracts.length} mục</span>
        </div>

        {contracts.length === 0 ? (
          <EmptyState text="Chưa có hợp đồng nào." />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Hợp đồng</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Ngày tạo</th>
                  <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">Phiên bản</th>
                  <th className="text-center px-4 py-2.5 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contracts.map((c) => {
                  const st = CONTRACT_STATUS[c.status] ?? CONTRACT_STATUS.draft;
                  const title = (c.content?.title as string) || `Hợp đồng #${c.id.slice(0, 8)}`;
                  return (
                    <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground truncate max-w-[200px]">{title}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{fmtDate(c.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">v{c.version_number}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon, label, value, hint, tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone: "primary" | "warning" | "success" | "default";
}) {
  const toneCls =
    tone === "primary" ? "text-primary bg-primary/10" :
    tone === "warning"  ? "text-amber-600 bg-amber-500/10" :
    tone === "success"  ? "text-emerald-600 bg-emerald-500/10" :
    "text-foreground bg-secondary";

  return (
    <div className="rounded-xl border border-border p-4">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${toneCls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xs text-muted-foreground mt-3">{label}</div>
      <div className="text-xl font-bold tracking-tight mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
      <XCircle className="h-6 w-6 mx-auto mb-2 opacity-30" />
      {text}
    </div>
  );
}
