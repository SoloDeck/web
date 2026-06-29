import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Loader2,
  Mail,
  Phone,
  Plus,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/Sidebar";
import { NewDealModal } from "@/features/deals/components/NewDealModal";
import { useClient, useClientCommLogs } from "@/features/clients/hooks/useClients";
import { useClientDeals } from "@/features/deals/hooks/useDeals";
import { STAGE_BY_ID, type Deal } from "@/features/deals/types";
import { formatVND } from "@/utils/format";
import { cn } from "@/lib/utils";

export function ClientDetailPage({ clientId }: { clientId: string }) {
  const navigate = useNavigate();
  const clientQuery = useClient(clientId);
  const dealsQuery = useClientDeals(clientId);
  const commLogsQuery = useClientCommLogs(clientId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newDealOpen, setNewDealOpen] = useState(false);

  const client = clientQuery.data;
  const deals = useMemo(
    () => [...(dealsQuery.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [dealsQuery.data]
  );
  const totalValue = useMemo(() => deals.reduce((sum, deal) => sum + deal.value, 0), [deals]);
  const activeDeals = useMemo(
    () => deals.filter((deal) => deal.stage !== "lost" && deal.stage !== "completed_and_billed").length,
    [deals]
  );

  function goBack() {
    navigate({ to: "/" });
  }

  function openDeal(deal: Deal) {
    navigate({ to: "/deals/$dealId", params: { dealId: deal.id } });
  }

  if (clientQuery.isLoading) {
    return (
      <div className="grid h-screen place-items-center bg-background text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải hồ sơ khách hàng...
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="grid h-screen place-items-center bg-background p-4 text-center">
        <div>
          <h1 className="text-lg font-semibold">Không tìm thấy khách hàng</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Khách hàng có thể đã bị lưu trữ hoặc bạn không có quyền truy cập.
          </p>
          <button
            onClick={goBack}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const initials =
    client.name
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "KH";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        active="clients"
        onOpenAI={() => setNewDealOpen(true)}
        onNavigate={(nav) => navigate({ to: nav === "admin" ? "/admin" : "/" })}
      />

      <main className="min-w-0 flex-1 overflow-auto">
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={goBack}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Quay lại hồ sơ khách hàng"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Hồ sơ khách hàng</span>
                  <span>/</span>
                  <span>Chi tiết</span>
                </div>
                <h1 className="truncate text-lg font-bold">{client.name}</h1>
              </div>
            </div>

            <button
              onClick={() => setNewDealOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Thêm dự án mới
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-6">
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{client.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {client.type === "company" ? "Công ty" : "Cá nhân"}
                    </p>
                  </div>
                </div>

                <div className="my-5 border-t border-border" />

                <div className="space-y-3 text-sm">
                  <InfoLine icon={Phone} label="Số điện thoại" value={client.phone || "Chưa có"} />
                  <InfoLine icon={Mail} label="Email" value={client.email || "Chưa có"} />
                  <InfoLine icon={CalendarDays} label="Ngày tạo" value={formatDate(client.created_at)} />
                </div>

                <div className="my-5 border-t border-border" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ghi chú khách hàng
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {client.notes || client.description || "Chưa có ghi chú khách hàng."}
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tổng quan hợp tác
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Metric label="Dự án" value={`${deals.length}`} />
                  <Metric label="Đang chạy" value={`${activeDeals}`} />
                  <Metric className="col-span-2" label="Tổng giá trị" value={formatVND(totalValue)} />
                </div>
              </section>
            </aside>

            <section className="min-w-0 space-y-4">
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Dự án đã hợp tác</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {/* BE chưa có API deal theo client_id, danh sách này đang lấy GET /deals rồi lọc theo clientId ở service. */}
                      Dữ liệu dự án đang dùng fallback có kiểm soát cho đến khi backend hỗ trợ filter theo khách hàng.
                    </p>
                  </div>
                  {dealsQuery.isFetching && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang cập nhật...
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {deals.map((deal) => (
                    <DealRow key={deal.id} deal={deal} onOpen={() => openDeal(deal)} />
                  ))}

                  {!dealsQuery.isLoading && deals.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center">
                      <BriefcaseBusiness className="mx-auto h-8 w-8 text-muted-foreground/60" />
                      <h3 className="mt-3 text-sm font-semibold">Chưa có dự án hợp tác</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Khi backend có dữ liệu deal theo khách hàng, danh sách sẽ tự cập nhật tại đây.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-base font-semibold">Lịch sử tương tác</h2>
                <div className="mt-4 space-y-3">
                  {(commLogsQuery.data ?? []).map((log) => (
                    <div key={log.id} className="rounded-lg border border-border px-3 py-2">
                      <div className="text-xs text-muted-foreground">
                        {formatDate(log.communicated_at)} · {log.channel}
                      </div>
                      <div className="mt-1 text-sm">{log.summary}</div>
                    </div>
                  ))}
                  {!commLogsQuery.isLoading && (commLogsQuery.data ?? []).length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                      Chưa có lịch sử tương tác từ API comm-logs.
                    </div>
                  )}
                </div>
              </section>
            </section>
          </div>
        </div>
      </main>

      <NewDealModal open={newDealOpen} onClose={() => setNewDealOpen(false)} />
    </div>
  );
}

function DealRow({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  const stage = STAGE_BY_ID[deal.stage];

  return (
    <article className="rounded-xl border border-border p-4 transition-colors hover:bg-secondary/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{deal.projectType}</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
              <span className={cn("h-2 w-2 rounded-full", stage.dotClass)} />
              {stage.shortTitle}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {deal.notes || "Chưa có mô tả yêu cầu dự án."}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Tạo ngày {formatDate(deal.createdAt)}</span>
            <span>{deal.channel}</span>
            <span className="font-semibold text-primary">{formatVND(deal.value)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Xem chi tiết dự án
        </button>
      </div>
    </article>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="break-words font-medium">{value}</div>
      </div>
    </div>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 p-3", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function formatDate(value: string): string {
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
