/**
 * DealDetailBody.tsx — nội dung chi tiết dự án với tab navigation:
 *   Tổng quan | Lịch sử tương tác | Báo giá & Hợp đồng | Hóa đơn & Thanh toán | Lịch nhắc
 */

import { useEffect, useState } from "react";
import {
  Phone, Mail, Building2, User, Loader2, MessageSquare,
  Calendar, FileText, Plus, TrendingUp,
  Bell, CreditCard, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { formatVND } from "@/utils/format";
import {
  getClient, getCommLogs, addCommLog,
  type ClientRecord, type CommLog,
} from "@/services/clientsService";
import { STAGES, type Deal } from "../types";

// ── Hằng số ───────────────────────────────────────────────────────────────────

const MAIN_STAGES = STAGES.filter((s) => s.id !== "lost");
const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.title]));
const STAGE_SHORT: Record<string, string> = {
  new_lead:             "Y/C Mới",
  qualified:            "Sàng Lọc",
  proposal_sent:        "Báo Giá",
  in_negotiation:       "Đàm Phán",
  active:               "Triển Khai",
  completed_and_billed: "Hoàn Thành",
};
const STAGE_COLOR: Record<string, string> = {
  new_lead:             "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  qualified:            "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  proposal_sent:        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  in_negotiation:       "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  active:               "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  completed_and_billed: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  lost:                 "bg-destructive/10 text-destructive border-destructive/20",
};
const PAYMENT_COLOR: Record<string, string> = {
  "Chưa thanh toán": "bg-destructive/10 text-destructive border-destructive/20",
  "Đã đặt cọc":      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  "Đã thanh toán":   "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
};
const CHANNEL_LABEL: Record<string, string> = {
  zalo: "Zalo", email: "Email", phone: "Điện thoại",
  meeting: "Gặp mặt", message: "Nhắn tin",
};
const COMM_CHANNELS = [
  { value: "zalo",    label: "Zalo" },
  { value: "email",   label: "Email" },
  { value: "phone",   label: "Điện thoại" },
  { value: "meeting", label: "Gặp mặt" },
  { value: "message", label: "Nhắn tin" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabId = "overview" | "history" | "contracts" | "reminders";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview",   label: "Tổng quan",          icon: TrendingUp },
  { id: "history",    label: "Lịch sử tương tác",  icon: MessageSquare },
  { id: "contracts",  label: "Báo giá & Hợp đồng", icon: FileText },
  { id: "reminders",  label: "Lịch nhắc",           icon: Bell },
];

function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div className="flex items-end border-b border-border overflow-x-auto shrink-0 px-2 scrollbar-none">
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`
              px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0
              ${isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"}
            `}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Stage Stepper ─────────────────────────────────────────────────────────────

function StageStepper({ stage }: { stage: string }) {
  const isLost = stage === "lost";
  const currentIdx = MAIN_STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        {MAIN_STAGES.map((s, i) => {
          const done    = !isLost && i < currentIdx;
          const current = !isLost && i === currentIdx;
          return (
            <div key={s.id} className="flex items-center flex-1 min-w-0">
              <div className={`
                shrink-0 h-3 w-3 rounded-full border-2 transition-colors
                ${current ? "bg-primary border-primary ring-2 ring-primary/25"
                          : done  ? "bg-primary border-primary"
                                  : "bg-background border-muted-foreground/30"}
              `} />
              {i < MAIN_STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 ${done ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex">
        {MAIN_STAGES.map((s) => (
          <div key={s.id} className="flex-1 min-w-0 text-center">
            <span className={`text-[9px] font-medium ${s.id === stage && !isLost ? "text-primary" : "text-muted-foreground"}`}>
              {STAGE_SHORT[s.id]}
            </span>
          </div>
        ))}
      </div>
      {isLost && <p className="text-xs font-semibold text-destructive text-center">Không chốt được</p>}
    </div>
  );
}

// ── Info Chip (tag hiển thị từng mục) ────────────────────────────────────────

function InfoChip({
  label, value, colorCls, icon: Icon,
}: {
  label: string; value: string; colorCls?: string; icon?: React.ElementType;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 space-y-0.5 ${colorCls ?? "border-border bg-muted/40"}`}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <p className="text-sm font-semibold leading-tight truncate">{value}</p>
      </div>
    </div>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────

function ClientCard({ clientId, initial }: { clientId: string; initial?: ClientRecord }) {
  const [client, setClient] = useState<ClientRecord | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    if (initial) return;
    getClient(clientId).then(setClient).catch(() => {}).finally(() => setLoading(false));
  }, [clientId, initial]);

  if (loading) return (
    <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
    </div>
  );
  if (!client) return null;

  const initial_char = client.name.trim().charAt(0).toUpperCase();
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-start gap-3">
      <div className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 font-bold text-white text-base shadow-sm ${client.type === "company" ? "bg-violet-500" : "bg-primary"}`}>
        {initial_char}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm">{client.name}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          {client.type === "company"
            ? <><Building2 className="h-3 w-3" /> Công ty</>
            : <><User className="h-3 w-3" /> Cá nhân</>}
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          {client.phone && (
            <a href={`tel:${client.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <Phone className="h-3 w-3" />{client.phone}
            </a>
          )}
          {client.email && (
            <a href={`mailto:${client.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors truncate">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[200px]">{client.email}</span>
            </a>
          )}
        </div>
        {client.description && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">{client.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Comm-log components ───────────────────────────────────────────────────────

function CommLogItem({ log }: { log: CommLog }) {
  return (
    <div className="relative pl-5">
      <div className="absolute -left-[3px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/60 border-2 border-background ring-1 ring-primary/20" />
      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full bg-secondary px-2 py-0.5">
          <MessageSquare className="h-2.5 w-2.5" />{CHANNEL_LABEL[log.channel] ?? log.channel}
        </span>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Calendar className="h-2.5 w-2.5" />{fmtDateTime(log.communicated_at)}
        </span>
      </div>
      <p className="text-sm leading-relaxed">{log.summary}</p>
    </div>
  );
}

function AddCommLogForm({ onSubmit, onCancel }: {
  onSubmit: (channel: string, summary: string, date: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [channel, setChannel] = useState("zalo");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!summary.trim()) return;
    setBusy(true);
    try { await onSubmit(channel, summary.trim(), new Date(date).toISOString()); setSummary(""); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex gap-2">
        <select value={channel} onChange={(e) => setChannel(e.target.value)}
          className="text-xs rounded-lg border border-input bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring">
          {COMM_CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
          className="flex-1 text-xs rounded-lg border border-input bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
        placeholder="Nội dung trao đổi..." rows={3}
        className="w-full text-sm rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring resize-none" />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary">Huỷ</button>
        <button onClick={submit} disabled={busy || !summary.trim()}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1.5">
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}Lưu ghi chú
        </button>
      </div>
    </div>
  );
}

// ── Placeholder tab ───────────────────────────────────────────────────────────

function PlaceholderTab({ icon: Icon, title, desc }: {
  icon: React.ElementType; title: string; desc: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
      <div className="h-14 w-14 rounded-2xl bg-muted/60 grid place-items-center">
        <Icon className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{desc}</p>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1">
        <CheckCircle2 className="h-3 w-3" /> Sẽ ra mắt trong phiên bản tiếp theo
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export type DealDetailBodyProps = {
  deal:           Deal;
  initialClient?: ClientRecord;
  defaultTab?:    TabId;
};

export function DealDetailBody({ deal, initialClient, defaultTab = "overview" }: DealDetailBodyProps) {
  const [tab, setTab]             = useState<TabId>(defaultTab);
  const [commLogs, setCommLogs]   = useState<CommLog[]>([]);
  const [loadingLogs, setLoading] = useState(true);
  const [addingLog, setAdding]    = useState(false);

  useEffect(() => {
    setCommLogs([]);
    setLoading(true);
    getCommLogs(deal.clientId)
      .then(setCommLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deal.clientId]);

  // Reset về tab overview khi deal đổi
  useEffect(() => { setTab(defaultTab); }, [deal.id, defaultTab]);

  const handleAddLog = async (channel: string, summary: string, date: string) => {
    const log = await addCommLog(deal.clientId, { channel, summary, communicated_at: date })
      .catch(() => { toast.error("Không thể thêm lịch sử liên hệ."); return null; });
    if (!log) return;
    setCommLogs((prev) => [log, ...prev]);
    setAdding(false);
    toast.success("Đã ghi nhận.");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Tab Bar */}
      <TabBar active={tab} onChange={setTab} />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Tổng quan ───────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="px-5 py-5 space-y-5">

            {/* Tiến trình giai đoạn */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Tiến trình
              </p>
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-4">
                <StageStepper stage={deal.stage} />
              </div>
            </section>

            {/* Info chips — dạng tag */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Thông tin dự án
              </p>
              <div className="grid grid-cols-2 gap-2">
                <InfoChip
                  label="Giá trị"
                  value={formatVND(deal.value)}
                  colorCls="border-primary/20 bg-primary/5"
                  icon={CreditCard}
                />
                <InfoChip
                  label="Thanh toán"
                  value={deal.paymentStatus}
                  colorCls={PAYMENT_COLOR[deal.paymentStatus] ?? "border-border bg-muted/40"}
                />
                <InfoChip
                  label="Giai đoạn"
                  value={STAGE_LABEL[deal.stage] ?? deal.stage}
                  colorCls={STAGE_COLOR[deal.stage] ?? "border-border bg-muted/40"}
                />
                <InfoChip
                  label="Kênh tiếp cận"
                  value={deal.channel}
                  colorCls="border-border bg-muted/40"
                />
                {deal.contact && (
                  <InfoChip
                    label="Liên hệ"
                    value={deal.contact}
                    colorCls="border-border bg-muted/40 col-span-2"
                    icon={Phone}
                  />
                )}
                <InfoChip
                  label="Ngày tạo"
                  value={fmtDate(deal.createdAt)}
                  colorCls="border-border bg-muted/40"
                  icon={Calendar}
                />
                <InfoChip
                  label="Cập nhật lần cuối"
                  value={fmtDate(deal.updatedAt)}
                  colorCls="border-border bg-muted/40"
                  icon={Calendar}
                />
              </div>
            </section>

            {/* Ghi chú */}
            {deal.notes && (
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Ghi chú
                </p>
                <p className="text-sm bg-muted/40 rounded-xl border border-border px-4 py-3 whitespace-pre-wrap leading-relaxed">
                  {deal.notes}
                </p>
              </section>
            )}

            {/* Khách hàng */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Khách hàng
              </p>
              <ClientCard clientId={deal.clientId} initial={initialClient} />
            </section>

            <div className="h-2" />
          </div>
        )}

        {/* ── Lịch sử tương tác ───────────────────────────────────────── */}
        {tab === "history" && (
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                Lịch sử liên hệ
                {!loadingLogs && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({commLogs.length})</span>
                )}
              </p>
              {!addingLog && (
                <button onClick={() => setAdding(true)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  <Plus className="h-3 w-3" /> Thêm ghi chú
                </button>
              )}
            </div>

            {addingLog && (
              <AddCommLogForm onSubmit={handleAddLog} onCancel={() => setAdding(false)} />
            )}

            {loadingLogs ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
              </div>
            ) : commLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto opacity-30" />
                <p className="text-sm">Chưa có lịch sử liên hệ nào.</p>
                <p className="text-xs">Nhấn <em>Thêm ghi chú</em> để bắt đầu ghi nhận.</p>
              </div>
            ) : (
              <div className="relative pl-2 space-y-5">
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
                {commLogs.map((log) => <CommLogItem key={log.id} log={log} />)}
              </div>
            )}

            <div className="h-4" />
          </div>
        )}

        {/* ── Báo giá & Hợp đồng ─────────────────────────────────────── */}
        {tab === "contracts" && (
          <PlaceholderTab
            icon={FileText}
            title="Báo giá & Hợp đồng"
            desc="Quản lý báo giá, hợp đồng và tài liệu đính kèm cho dự án này. Tính năng đang được phát triển."
          />
        )}

        {/* ── Lịch nhắc ──────────────────────────────────────────────── */}
        {tab === "reminders" && (
          <PlaceholderTab
            icon={Bell}
            title="Lịch nhắc"
            desc="Đặt nhắc nhở theo dõi, lịch họp và các mốc quan trọng của dự án. Tính năng đang được phát triển."
          />
        )}
      </div>
    </div>
  );
}
