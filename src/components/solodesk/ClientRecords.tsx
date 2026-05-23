import { useMemo, useState } from "react";
import { Search, Phone, MessageCircle, FileText, Mail, Share2 } from "lucide-react";
import { formatVND, type Deal } from "@/lib/mock-data";

const channelIcon = {
  Zalo: MessageCircle,
  Email: Mail,
  Facebook: Share2,
} as const;

const paymentColor = {
  "Chưa thanh toán": "bg-destructive/15 text-destructive",
  "Đã đặt cọc": "bg-warning/20 text-warning-foreground",
  "Đã thanh toán": "bg-success/15 text-success",
} as const;

export function ClientRecords({
  deals,
  onOpenDeal,
}: {
  deals: Deal[];
  onOpenDeal: (d: Deal) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "unpaid">("all");

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      const matchesQ =
        !q ||
        d.client.toLowerCase().includes(q.toLowerCase()) ||
        d.contact.toLowerCase().includes(q.toLowerCase()) ||
        d.projectType.toLowerCase().includes(q.toLowerCase());
      const matchesF =
        filter === "all"
          ? true
          : filter === "active"
            ? !["completed"].includes(d.stage)
            : filter === "completed"
              ? d.stage === "completed"
              : d.paymentStatus !== "Đã thanh toán";
      return matchesQ && matchesF;
    });
  }, [deals, q, filter]);



  const totals = {
    clients: deals.length,
    active: deals.filter((d) => d.stage !== "completed").length,
    unpaid: deals.filter((d) => d.paymentStatus !== "Đã thanh toán").length,
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col">
      <div className="flex items-center gap-4 text-sm mb-4">
        <div className="font-semibold">{totals.clients} khách hàng</div>
        <div className="text-muted-foreground">·</div>
        <div className="text-muted-foreground">{totals.active} đang hoạt động</div>
        <div className="text-muted-foreground">·</div>
        <div className="text-muted-foreground">{totals.unpaid} chưa thanh toán đủ</div>
      </div>

      <div className="py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm khách, dự án, liên hệ..."
              className="bg-transparent text-sm flex-1 outline-none"
            />
          </div>
          <div className="flex items-center gap-1 text-xs">
            {[
              { id: "all", label: "Tất cả" },
              { id: "active", label: "Đang hoạt động" },
              { id: "completed", label: "Hoàn thành" },
              { id: "unpaid", label: "Chưa thanh toán" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filter === f.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "border border-border hover:bg-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-6 py-2.5">Khách hàng</th>
                <th className="text-left font-semibold px-3 py-2.5">Dự án</th>
                <th className="text-left font-semibold px-3 py-2.5">Liên hệ</th>
                <th className="text-right font-semibold px-3 py-2.5">Giá trị</th>
                <th className="text-left font-semibold px-3 py-2.5">Thanh toán</th>
                <th className="text-left font-semibold px-3 py-2.5">Tài liệu</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const Ico = channelIcon[d.channel];
                return (
                  <tr
                    key={d.id}
                    className="border-b border-border last:border-b-0 hover:bg-secondary/40 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="font-semibold truncate max-w-[200px]">{d.client}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Ico className="h-3 w-3" /> {d.channel} · {d.history.length} tương tác
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground max-w-[220px] truncate">
                      {d.projectType}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" /> {d.contact}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-primary">
                      {formatVND(d.value)}
                    </td>
                    <td className="px-3 py-3">
                      <div className={`inline-flex text-[11px] font-semibold rounded-full px-2 py-0.5 ${paymentColor[d.paymentStatus]}`}>
                        {d.paymentStatus}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{d.paymentMethod}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" /> 2 file
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => onOpenDeal(d)}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        Mở
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                    Không có khách hàng phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
}
