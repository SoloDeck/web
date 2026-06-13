/**
 * ClientDetailSheet.tsx
 *
 * Sheet trượt từ PHẢI — chi tiết khách hàng.
 * Khi click vào một dự án, một panel trượt từ TRÁI hiện ra (không backdrop)
 * để hiển thị song song mà không che khuất sheet khách hàng.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Phone, Mail, Briefcase, MessageSquare,
  Plus, Loader2, Building2, User, ChevronRight,
  Calendar, X, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { formatVND } from "@/utils/format";
import {
  getCommLogs, addCommLog,
  type ClientRecord, type CommLog,
} from "@/services/clientsService";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import { STAGES, type Deal } from "@/features/deals/types";
import { DealDetailBody } from "@/features/deals/components/DealDetailBody";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.title]));

const STAGE_COLOR: Record<string, string> = {
  new_lead:             "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  qualified:            "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  proposal_sent:        "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  in_negotiation:       "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  active:               "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  completed_and_billed: "bg-green-500/10 text-green-600 dark:text-green-400",
  lost:                 "bg-destructive/10 text-destructive",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  prospect: { label: "Tiềm năng",       cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  active:   { label: "Đang hoạt động",  cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  inactive: { label: "Không hoạt động", cls: "bg-muted text-muted-foreground" },
  archived: { label: "Lưu trữ",         cls: "bg-destructive/10 text-destructive" },
};

// Kênh liên hệ — value khớp PostgreSQL enum comm_channel
const CHANNELS: { value: string; label: string }[] = [
  { value: "zalo",    label: "Zalo" },
  { value: "email",   label: "Email" },
  { value: "phone",   label: "Điện thoại" },
  { value: "meeting", label: "Gặp mặt" },
  { value: "message", label: "Nhắn tin" },
];

const CHANNEL_LABEL: Record<string, string> = Object.fromEntries(
  CHANNELS.map((c) => [c.value, c.label]),
);

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Panel chi tiết dự án (trượt từ trái, không backdrop) ─────────────────────

/**
 * Panel bên TRÁI hiện song song với Sheet bên phải.
 * Dùng createPortal + fixed positioning thay vì Sheet để tránh backdrop đè lên sheet khách hàng.
 * z-[51] cao hơn z-50 của Sheet backdrop nên vẫn hiện rõ.
 * Nội dung dùng DealDetailBody (component chia sẻ với DealDetailModal).
 */
function DealDetailPanel({
  deal,
  client,
  onClose,
  onOpenInPipeline,
}: {
  deal: Deal | null;
  client: ClientRecord | null;
  onClose: () => void;
  onOpenInPipeline: (d: Deal) => void;
}) {
  const visible = !!deal;

  return createPortal(
    <div
      className={`
        fixed inset-y-0 left-0 z-[51] w-full sm:w-[620px]
        bg-popover border-r border-border shadow-2xl
        flex flex-col
        transition-transform duration-200 ease-in-out
        ${visible ? "translate-x-0" : "-translate-x-full"}
      `}
      aria-hidden={!visible}
    >
      {deal && (
        <>
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border bg-card shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={onClose}
                    className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-muted-foreground">Chi tiết dự án</span>
                </div>
                <h2 className="text-base font-bold leading-tight">{deal.projectType}</h2>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{deal.client}</p>
              </div>
              <button onClick={onClose}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className={`inline-flex text-[10px] font-semibold rounded-full px-2.5 py-0.5 ${STAGE_COLOR[deal.stage] ?? "bg-muted text-muted-foreground"}`}>
                {STAGE_LABEL[deal.stage] ?? deal.stage}
              </span>
              <span className="text-sm font-bold text-primary">{formatVND(deal.value)}</span>
            </div>
          </div>

          {/* Body — dùng DealDetailBody, truyền client để tránh re-fetch */}
          <DealDetailBody deal={deal} initialClient={client ?? undefined} />

          {/* Footer: nút chuyển sang Pipeline */}
          <div className="px-5 py-3 border-t border-border bg-card shrink-0">
            <button
              onClick={() => onOpenInPipeline(deal)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-primary text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/10 transition-colors"
            >
              <Briefcase className="h-4 w-4" /> Xem trong Pipeline
            </button>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}

// ── Sub-components cho Sheet phải ─────────────────────────────────────────────

function Avatar({ name, type }: { name: string; type: ClientRecord["type"] }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className={`h-14 w-14 rounded-2xl grid place-items-center shrink-0 font-bold text-white text-xl shadow-sm ${type === "company" ? "bg-violet-500" : "bg-primary"}`}>
      {initial}
    </div>
  );
}

function DealRow({
  deal,
  active,
  onClick,
}: {
  deal: Deal;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg border p-3 transition-colors text-left group ${active ? "border-primary/50 bg-primary/5" : "border-border hover:bg-secondary/50"}`}
    >
      <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{deal.projectType}</p>
        <span className={`inline-flex text-[10px] font-semibold rounded-full px-2 py-0.5 mt-0.5 ${STAGE_COLOR[deal.stage] ?? "bg-muted text-muted-foreground"}`}>
          {STAGE_LABEL[deal.stage] ?? deal.stage}
        </span>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-primary">{formatVND(deal.value)}</p>
        <p className="text-[10px] text-muted-foreground">{deal.channel}</p>
      </div>
      <ChevronRight className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100"}`} />
    </button>
  );
}

function CommLogItem({ log }: { log: CommLog }) {
  return (
    <div className="relative pl-5">
      <div className="absolute -left-[3px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/60 border-2 border-background ring-1 ring-primary/20" />
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full bg-secondary px-2 py-0.5">
          <MessageSquare className="h-2.5 w-2.5" />{CHANNEL_LABEL[log.channel] ?? log.channel}
        </span>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Calendar className="h-2.5 w-2.5" />{fmtDateTime(log.communicated_at)}
        </span>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{log.summary}</p>
    </div>
  );
}

function AddCommLogForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (channel: string, summary: string, date: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [channel, setChannel] = useState("zalo");
  const [summary, setSummary] = useState("");
  // Local time để tránh lệch múi giờ (toISOString() = UTC, Vietnam = UTC+7)
  const [date, setDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!summary.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(channel, summary.trim(), new Date(date).toISOString());
      setSummary("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 mb-4">
      <div className="flex gap-2">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="text-xs rounded-lg border border-input bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring"
        >
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 text-xs rounded-lg border border-input bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Nội dung trao đổi với khách hàng..."
        rows={3}
        className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !summary.trim()}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
        >
          {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
          Lưu ghi chú
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  client:     ClientRecord | null;
  onClose:    () => void;
  onOpenDeal: (deal: Deal) => void;
};

export function ClientDetailSheet({ client, onClose, onOpenDeal }: Props) {
  const allDeals = useDealStore((s) => s.deals);
  const [commLogs, setCommLogs]       = useState<CommLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [addingLog, setAddingLog]     = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const clientDeals = client
    ? allDeals
        .filter((d) => d.clientId === client.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  // Tải comm-logs khi mở sheet cho client mới; đóng deal panel khi đổi client
  useEffect(() => {
    if (!client) { setCommLogs([]); setSelectedDeal(null); return; }
    setCommLogs([]);
    setAddingLog(false);
    setSelectedDeal(null);
    setLoadingLogs(true);
    getCommLogs(client.id)
      .then(setCommLogs)
      .catch(() => toast.error("Không thể tải lịch sử liên hệ."))
      .finally(() => setLoadingLogs(false));
  }, [client?.id]);

  const handleAddLog = async (channel: string, summary: string, date: string) => {
    if (!client) return;
    const newLog = await addCommLog(client.id, { channel, summary, communicated_at: date })
      .catch(() => { toast.error("Không thể thêm lịch sử liên hệ."); return null; });
    if (!newLog) return;
    setCommLogs((prev) => [newLog, ...prev]);
    setAddingLog(false);
    toast.success("Đã ghi nhận lịch sử liên hệ.");
  };

  // Khi mở Pipeline từ deal panel: đóng cả hai panel rồi navigate
  const handleOpenInPipeline = (deal: Deal) => {
    setSelectedDeal(null);
    onClose();
    onOpenDeal(deal);
  };

  const statusCfg = client
    ? (STATUS_CONFIG[client.status] ?? STATUS_CONFIG.inactive)
    : null;

  return (
    <>
      {/* Panel trái — chi tiết dự án (song song với sheet phải, không backdrop) */}
      <DealDetailPanel
        deal={selectedDeal}
        client={client}
        onClose={() => setSelectedDeal(null)}
        onOpenInPipeline={handleOpenInPipeline}
      />

      {/* Sheet phải — chi tiết khách hàng */}
      <Sheet open={!!client} onOpenChange={(open) => { if (!open) { setSelectedDeal(null); onClose(); } }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[580px] p-0 flex flex-col overflow-hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Chi tiết khách hàng</SheetTitle>
          </SheetHeader>

          {client && (
            <>
              {/* Header */}
              <div className="px-6 pt-6 pb-5 border-b border-border bg-card shrink-0">
                <div className="flex items-start gap-4">
                  <Avatar name={client.name} type={client.type} />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold leading-tight truncate">{client.name}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {client.type === "company"
                          ? <><Building2 className="h-3 w-3" />Công ty</>
                          : <><User className="h-3 w-3" />Cá nhân</>}
                      </span>
                      {statusCfg && (
                        <span className={`inline-flex text-[10px] font-semibold rounded-full px-2 py-0.5 ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2.5">
                      {client.phone && (
                        <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Phone className="h-3 w-3" />{client.phone}
                        </a>
                      )}
                      {client.email && (
                        <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">{client.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                {(client.description || client.notes) && (
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin</h3>
                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                      {client.description && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Mô tả</p>
                          <p className="text-sm">{client.description}</p>
                        </div>
                      )}
                      {client.notes && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Ghi chú</p>
                          <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground flex gap-3">
                      <span>Tạo: {fmtDate(client.created_at)}</span>
                      <span>Cập nhật: {fmtDate(client.updated_at)}</span>
                    </p>
                  </section>
                )}

                <Separator />

                {/* Dự án */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Dự án <span className="normal-case font-normal text-foreground">({clientDeals.length})</span>
                  </h3>
                  {clientDeals.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Chưa có dự án nào.</p>
                  ) : (
                    <div className="space-y-2">
                      {clientDeals.map((deal) => (
                        <DealRow
                          key={deal.id}
                          deal={deal}
                          active={selectedDeal?.id === deal.id}
                          onClick={() => setSelectedDeal(
                            selectedDeal?.id === deal.id ? null : deal
                          )}
                        />
                      ))}
                    </div>
                  )}
                  {clientDeals.length > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      Tổng giá trị:{" "}
                      <span className="font-semibold text-primary">
                        {formatVND(clientDeals.reduce((s, d) => s + d.value, 0))}
                      </span>
                    </p>
                  )}
                </section>

                <Separator />

                {/* Lịch sử liên hệ */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Lịch sử liên hệ{" "}
                      {!loadingLogs && <span className="normal-case font-normal text-foreground">({commLogs.length})</span>}
                    </h3>
                    {!addingLog && (
                      <button
                        onClick={() => setAddingLog(true)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Thêm ghi chú
                      </button>
                    )}
                  </div>

                  {addingLog && (
                    <AddCommLogForm onSubmit={handleAddLog} onCancel={() => setAddingLog(false)} />
                  )}

                  {loadingLogs ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lịch sử...
                    </div>
                  ) : commLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Chưa có lịch sử liên hệ. Nhấn <em>Thêm ghi chú</em> để bắt đầu.
                    </p>
                  ) : (
                    <div className="relative pl-2 space-y-5">
                      <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
                      {commLogs.map((log) => (
                        <CommLogItem key={log.id} log={log} />
                      ))}
                    </div>
                  )}
                </section>

                <div className="h-4" />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
