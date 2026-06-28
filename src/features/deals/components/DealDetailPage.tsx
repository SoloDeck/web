import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewDealModal } from "@/features/deals/components/NewDealModal";
import { ProposalModal } from "@/features/deals/components/ProposalModal";
import { ProjectTaskPanel } from "@/features/deals/components/ProjectTaskList";
import { useDeal, useDeleteDeal, useUpdateDeal } from "@/features/deals/hooks/useDeals";
import { DealReminderPanel } from "@/features/reminders/components/DealReminderPanel";
import { useDealReminders } from "@/features/reminders/hooks/useReminders";
import {
  useProjectTasks,
  useAddTask,
  useToggleTask,
  useUpdateTask,
  useDeleteTask,
} from "@/features/deals/hooks/useProjectTasks";
import { useClient, useClientCommLogs, useUpdateClient } from "@/features/clients/hooks/useClients";
import { useDealInvoices, useInvoicePayments } from "@/features/deals/hooks/useInvoices";
import { useProposalList } from "@/features/deals/hooks/useProposals";
import {
  useContractList,
  useCreateContract,
  useGenerateContractContent,
} from "@/features/deals/hooks/useContracts";
import { STAGES, STAGE_BY_ID, formatDealSource, type Deal, type ProjectTask } from "@/features/deals/types";
import { formatVND } from "@/utils/format";
import { cn } from "@/lib/utils";

type DetailTab = "overview" | "tasks" | "documents" | "reminders" | "history";
type DealDetailDraft = {
  title: string;
  notes: string;
};

export function DealDetailPage({ dealId }: { dealId: string }) {
  const navigate = useNavigate();
  const dealQuery = useDeal(dealId);
  const deal = dealQuery.data;
  const clientQuery = useClient(deal?.clientId);
  const commLogs = useClientCommLogs(deal?.clientId);
  const invoices = useDealInvoices(deal?.id);
  const firstInvoice = invoices.data?.[0];
  const payments = useInvoicePayments(firstInvoice?.id);
  const proposals = useProposalList({ deal_id: deal?.id, page_size: 10 });
  const contracts = useContractList({ deal_id: deal?.id, page_size: 10 });
  const reminders = useDealReminders(deal?.id);
  const deleteDeal = useDeleteDeal();
  const updateDeal = useUpdateDeal();
  const createContract = useCreateContract();
  const generateContract = useGenerateContractContent();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [proposalDeal, setProposalDeal] = useState<Deal | null>(null);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [draft, setDraft] = useState<DealDetailDraft>({
    title: "",
    notes: "",
  });

  const taskQuery = useProjectTasks(deal?.id);
  const projectId = taskQuery.data?.projectId ?? "";
  const addTaskMutation = useAddTask(deal?.id ?? "", projectId);
  const toggleTaskMutation = useToggleTask(deal?.id ?? "", projectId);
  const updateTaskMutation = useUpdateTask(deal?.id ?? "", projectId);
  const deleteTaskMutation = useDeleteTask(deal?.id ?? "", projectId);

  const proposalItems = proposals.data?.data ?? [];
  const contractItems = contracts.data?.data ?? [];
  const acceptedProposal = proposalItems.find((proposal) => proposal.status === "accepted");
  const latestProposal = proposalItems[0];
  const latestContract = contractItems[0];
  const historyItems = useMemo(() => {
    const apiLogs =
      commLogs.data?.map((log) => ({
        id: log.id,
        date: log.communicated_at,
        text: log.summary,
        channel: log.channel,
      })) ?? [];
    return [...apiLogs, ...(deal?.history ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  }, [commLogs.data, deal?.history]);

  const progressStageIndex = deal
    ? Math.max(0, STAGES.findIndex((stage) => stage.id === deal.stage))
    : 0;
  const progress = deal
    ? Math.round(((progressStageIndex + 1) / (STAGES.length - 1)) * 100)
    : 0;
  const hasOverviewChanges = Boolean(
    deal &&
      (draft.title !== deal.projectType ||
        draft.notes !== (deal.notes ?? ""))
  );

  useEffect(() => {
    if (!deal) return;
    setDraft({
      title: deal.projectType,
      notes: deal.notes ?? "",
    });
  }, [deal?.id, deal?.projectType, deal?.value, deal?.source, deal?.notes]);

  function goBack() {
    navigate({ to: "/" });
  }

  async function handleSaveOverview() {
    if (!deal) return;
    const title = draft.title.trim();
    if (!title) {
      toast.error("Tên dự án không được để trống.");
      return;
    }

    try {
      // Chỉ lưu tên và nội dung dự án; giá trị dự kiến không cho chỉnh ở detail.
      await updateDeal.mutateAsync({
        id: deal.id,
        payload: {
          client_id: deal.clientId,
          title,
          stage: deal.stage,
          notes: draft.notes.trim() || undefined,
        },
      });
      setOverviewEditing(false);
    } catch {
      // Toast lỗi đã xử lý trong hook useUpdateDeal.
    }
  }

  function cancelOverviewEdit() {
    if (!deal) return;
    setDraft({
      title: deal.projectType,
      notes: deal.notes ?? "",
    });
    setOverviewEditing(false);
  }

  function handleArchive() {
    if (!deal) return;
    const confirmed = window.confirm(`Loại bỏ dự án "${deal.projectType}"?`);
    if (!confirmed) return;
    deleteDeal.mutate(deal.id, {
      onSuccess: () => navigate({ to: "/" }),
    });
  }

  function handleGenerateContract() {
    if (!acceptedProposal) {
      toast.error("Cần có báo giá đã được khách chấp nhận trước khi tạo hợp đồng.");
      return;
    }
    createContract.mutate(
      { proposal_id: acceptedProposal.id },
      {
        onSuccess: (contract) => {
          generateContract.mutate(contract.id, {
            onSuccess: () => toast.success("Đã tạo nội dung hợp đồng bằng AI."),
          });
        },
      }
    );
  }

  function handleAddTask(title: string, note: string) {
    addTaskMutation.mutate({ title, note });
  }

  function handleUpdateTask(taskId: string, patch: Partial<ProjectTask>) {
    updateTaskMutation.mutate({ taskId, title: patch.title, note: patch.note });
  }

  function handleToggleTask(taskId: string, completed: boolean) {
    toggleTaskMutation.mutate({ taskId, is_done: completed });
  }

  function handleDeleteTask(taskId: string) {
    deleteTaskMutation.mutate(taskId);
  }

  if (dealQuery.isLoading) {
    return (
      <div className="grid h-screen place-items-center bg-background text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải chi tiết dự án...
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="grid h-screen place-items-center bg-background p-4 text-center">
        <div>
          <h1 className="text-lg font-semibold">Không tìm thấy dự án</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dự án có thể đã bị lưu trữ hoặc bạn không có quyền truy cập.</p>
          <button
            onClick={goBack}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Quay lại quy trình
          </button>
        </div>
      </div>
    );
  }

  const client = clientQuery.data;

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
        active="pipeline"
        onOpenAI={() => setNewDealOpen(true)}
        onNavigate={() => navigate({ to: "/" })}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 shrink-0 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={goBack}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Quay lại quy trình"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Dự án</span>
                  <span>/</span>
                  <span className="inline-flex items-center gap-1">
                    <span className={cn("h-2 w-2 rounded-full", STAGE_BY_ID[deal.stage].dotClass)} />
                    {STAGE_BY_ID[deal.stage].shortTitle}
                  </span>
                </div>
                <h1 className="truncate text-lg font-bold">{deal.client} — {draft.title || deal.projectType}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StageBadge deal={deal} />
              <button
                onClick={handleArchive}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Loại bỏ dự án
              </button>
              <button className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary" aria-label="Thêm tuỳ chọn">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-4 lg:p-6">
          <div className="grid h-full min-w-0 items-start gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
            <ClientInfoPanel
              deal={deal}
              client={client}
            />

            <section className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tổng quan dự án</div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {overviewEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={cancelOverviewEdit}
                          disabled={updateDeal.isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" /> Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveOverview}
                          disabled={!hasOverviewChanges || updateDeal.isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updateDeal.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          {updateDeal.isPending ? "Đang lưu..." : "Lưu"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOverviewEditing(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
                      </button>
                    )}
                    <div className="ml-2 text-right">
                    <div className="text-xs text-muted-foreground">Giá trị dự kiến</div>
                    <div className="mt-1 font-mono text-xl font-bold text-primary">{formatVND(deal.value)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 min-w-0">
                  {overviewEditing ? (
                    <>
                      <input
                        value={draft.title}
                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                        aria-label="Tên dự án"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xl font-bold outline-none focus:ring-2 focus:ring-ring"
                      />
                      <textarea
                        value={draft.notes}
                        onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                        aria-label="Mô tả dự án"
                        rows={4}
                        placeholder="Mô tả yêu cầu, phạm vi hoặc ghi chú nội bộ..."
                        className="mt-2 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
                      />
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold">{deal.projectType}</h2>
                      <p className="mt-2 w-full whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {deal.notes || "Chưa có mô tả chi tiết."}
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Tiến độ quy trình</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                    <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as DetailTab)}
                className="min-h-0 flex-1 flex-col gap-0 overflow-hidden"
              >
                <TabsList variant="line" className="w-full shrink-0 justify-start overflow-x-auto border-b border-border">
                  <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                  <TabsTrigger value="tasks">Công việc ({taskQuery.data?.total ?? 0})</TabsTrigger>
                  <TabsTrigger value="documents">Tài liệu ({proposalItems.length + contractItems.length})</TabsTrigger>
                  <TabsTrigger value="reminders">Nhắc nhở ({reminders.data?.length ?? 0})</TabsTrigger>
                  <TabsTrigger value="history">Lịch sử</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="min-w-0 pt-4">
                  <OverviewTab
                    deal={deal}
                    invoices={invoices.data ?? []}
                    payments={payments.data ?? []}
                    latestProposalTitle={latestProposal?.content?.title}
                    latestContractStatus={latestContract?.status}
                  />
                </TabsContent>

                <TabsContent value="tasks" className="min-w-0 pt-4">
                  <ProjectTaskPanel
                    tasks={taskQuery.data?.tasks ?? []}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onToggleTask={handleToggleTask}
                  />
                </TabsContent>

                <TabsContent value="documents" className="min-w-0 pt-4">
                  <DocumentsTab proposals={proposalItems} contracts={contractItems} />
                </TabsContent>

                <TabsContent value="reminders" className="min-h-0 min-w-0 flex-1 overflow-hidden pt-4">
                  <DealReminderPanel deal={deal} />
                </TabsContent>

                <TabsContent value="history" className="min-w-0 pt-4">
                  <HistoryTab historyItems={historyItems} isLoading={commLogs.isLoading} />
                </TabsContent>
              </Tabs>
            </section>

            <ActionsPanel
              deal={deal}
              onProposal={() => setProposalDeal(deal)}
              onContract={handleGenerateContract}
              onReminder={() => setTab("reminders")}
              contractLoading={createContract.isPending || generateContract.isPending}
              hasAcceptedProposal={Boolean(acceptedProposal)}
            />
          </div>
        </div>
      </main>

      <NewDealModal open={newDealOpen} onClose={() => setNewDealOpen(false)} />
      <ProposalModal deal={proposalDeal} onClose={() => setProposalDeal(null)} />
    </div>
  );
}

function StageBadge({ deal }: { deal: Deal }) {
  const stage = STAGE_BY_ID[deal.stage];

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium">
      <span className={cn("h-2 w-2 rounded-full", stage.dotClass)} />
      {stage.title}
    </div>
  );
}

function ClientInfoPanel({
  deal,
  client,
}: {
  deal: Deal;
  client?: { name?: string | null; email: string | null; phone: string | null; notes?: string | null };
}) {
  const updateClient = useUpdateClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    phone: "",
    email: "",
    notes: "",
  });
  const initials = deal.client
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "KH";
  const phone = client?.phone ?? deal.clientPhone;
  const email = client?.email ?? deal.clientEmail;
  const notes = client?.notes ?? "";
  const hasChanges =
    draft.phone !== (phone ?? "") ||
    draft.email !== (email ?? "") ||
    draft.notes !== notes;

  useEffect(() => {
    setDraft({
      phone: phone ?? "",
      email: email ?? "",
      notes,
    });
  }, [deal.clientId, phone, email, notes]);

  function cancelEdit() {
    setDraft({
      phone: phone ?? "",
      email: email ?? "",
      notes,
    });
    setEditing(false);
  }

  function saveClientInfo() {
    updateClient.mutate(
      {
        id: deal.clientId,
        payload: {
          name: client?.name ?? deal.client,
          phone: draft.phone.trim() || null,
          email: draft.email.trim() || null,
          notes: draft.notes.trim() || null,
        },
      },
      {
        onSuccess: () => setEditing(false),
      }
    );
  }

  return (
    <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{deal.client}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{phone || "Chưa có Zalo/SĐT"}</p>
          <div className="mt-2 flex gap-1.5">
            <ContactButton label="Zalo" disabled={!phone} />
            <ContactButton icon={Mail} label="Email" disabled={!email} />
          </div>
        </div>
      </div>

      <div className="my-5 border-t border-border" />

      <dl className="space-y-3 text-sm">
        <InfoRow label="Nguồn" value={formatDealSource(deal.source)} />
        <InfoRow label="Ngày tạo" value={formatDate(deal.createdAt)} />
        <InfoRow label="Kênh" value={deal.channel} />
        {editing ? (
          <>
            <EditableInfoRow
              label="Số điện thoại"
              value={draft.phone}
              placeholder="Nhập số điện thoại"
              onChange={(phone) => setDraft((current) => ({ ...current, phone }))}
            />
            <EditableInfoRow
              label="Email"
              value={draft.email}
              placeholder="Nhập email"
              onChange={(email) => setDraft((current) => ({ ...current, email }))}
            />
          </>
        ) : (
          <>
            <InfoRow label="Số điện thoại" value={phone || "Chưa có"} />
            <InfoRow label="Email" value={email || "Chưa có"} />
          </>
        )}
      </dl>

      <div className="my-5 border-t border-border" />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ghi chú nội bộ</div>
        {editing ? (
          <textarea
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            rows={4}
            placeholder="Nhập ghi chú khách hàng"
            className="mt-2 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {client?.notes || deal.notes || "Chưa có ghi chú khách hàng."}
          </p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          disabled={!phone}
          className="inline-flex items-center justify-center rounded-lg bg-success px-3 py-2 text-sm font-semibold text-success-foreground hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Zalo
        </button>
        <button
          disabled={!email}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Mail className="h-4 w-4" /> Email
        </button>
      </div>

      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        {editing ? (
          <>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={updateClient.isPending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Hủy
            </button>
            <button
              type="button"
              onClick={saveClientInfo}
              disabled={!hasChanges || updateClient.isPending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {updateClient.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary"
          >
            <Pencil className="h-4 w-4" /> Chỉnh sửa
          </button>
        )}
      </div>
    </aside>
  );
}

function ContactButton({ icon: Icon, label, disabled }: { icon?: typeof Mail; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-45"
    >
      {Icon && <Icon className="h-3 w-3" />} {label}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
    </div>
  );
}

function EditableInfoRow({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function ActionsPanel({
  deal,
  onProposal,
  onContract,
  onReminder,
  contractLoading,
  hasAcceptedProposal,
}: {
  deal: Deal;
  onProposal: () => void;
  onContract: () => void;
  onReminder: () => void;
  contractLoading: boolean;
  hasAcceptedProposal: boolean;
}) {
  return (
    <aside className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm xl:sticky xl:top-20 xl:self-start">
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Đánh giá AI
        </div>
        <div className="mt-3 text-3xl font-bold text-primary">{deal.aiQualificationScore ?? 50}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {deal.aiQualificationRecommendation ?? "Backend chưa có đánh giá AI chi tiết, giao diện đang dùng điểm dự phòng có kiểm soát."}
        </p>
      </div>

      <button
        onClick={onProposal}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        <FileText className="h-4 w-4" /> Tạo Báo Giá AI
      </button>
      <button
        onClick={onContract}
        disabled={contractLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        title={!hasAcceptedProposal ? "Cần báo giá đã chấp nhận trước" : "Tạo hợp đồng"}
      >
        {contractLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
        {contractLoading ? "Đang tạo..." : "Tạo hợp đồng"}
      </button>

      <div className="border-t border-border pt-4">
        <button
          onClick={onReminder}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
        >
          <Send className="h-4 w-4" /> Nhắc follow-up
        </button>
      </div>
    </aside>
  );
}

function OverviewTab({
  deal,
  invoices,
  payments,
  latestProposalTitle,
  latestContractStatus,
}: {
  deal: Deal;
  invoices: Array<{ id: string; status: string; total: number; amount_paid: number; due_date: string }>;
  payments: Array<{ id: string; amount: number; payment_date: string; payment_method: string }>;
  latestProposalTitle?: string;
  latestContractStatus?: string;
}) {
  const invoice = invoices[0];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoCard icon={FileText} title="Tài liệu">
        <p className="text-sm text-muted-foreground">
          Báo giá mới nhất: <span className="font-medium text-foreground">{latestProposalTitle ?? "Chưa có"}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Hợp đồng: <span className="font-medium text-foreground">{latestContractStatus ?? "Chưa có"}</span>
        </p>
      </InfoCard>
      <InfoCard icon={CreditCard} title="Thanh toán">
        {invoice ? (
          <>
            <p className="text-sm">
              <span className="font-medium">{formatVND(invoice.amount_paid)}</span> / {formatVND(invoice.total)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Trạng thái {invoice.status} · hạn {formatDate(invoice.due_date)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{payments.length} giao dịch đã ghi nhận</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Chưa có hóa đơn liên kết dự án. UI vẫn hiển thị khu thanh toán để sẵn sàng khi BE có dữ liệu.
          </p>
        )}
      </InfoCard>
      <InfoCard icon={CalendarDays} title="Mốc thời gian">
        <p className="text-sm text-muted-foreground">
          Tạo ngày {formatDate(deal.createdAt)} · cập nhật {deal.updatedAt ? formatDate(deal.updatedAt) : "chưa rõ"}
        </p>
      </InfoCard>
      <InfoCard icon={CheckCircle2} title="Ghi chú">
        <p className="text-sm text-muted-foreground">{deal.notes || "Chưa có ghi chú."}</p>
      </InfoCard>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      {children}
    </section>
  );
}

function DocumentsTab({
  proposals,
  contracts,
}: {
  proposals: Array<{ id: string; status: string; version_number: number; created_at: string; content?: { title?: string } }>;
  contracts: Array<{ id: string; status: string; version_number: number; created_at: string }>;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      {[...proposals.map((item) => ({ ...item, kind: "Báo giá" })), ...contracts.map((item) => ({ ...item, kind: "Hợp đồng" }))].map((item) => (
        <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <div>
            <div className="text-sm font-semibold">
              {item.kind} v{item.version_number}
            </div>
            <div className="text-xs text-muted-foreground">{formatDate(item.created_at)}</div>
          </div>
          <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium">{item.status}</span>
        </div>
      ))}
      {proposals.length + contracts.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Chưa có tài liệu nào cho dự án này.
        </div>
      )}
    </div>
  );
}

function HistoryTab({
  historyItems,
  isLoading,
}: {
  historyItems: Array<{ id?: string; date: string; text: string; channel?: string }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Đang tải lịch sử...</div>;
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {historyItems.length > 0 ? (
        <ol className="space-y-4 border-l-2 border-border pl-4">
          {historyItems.map((item, index) => (
            <li key={item.id ?? index} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
              <div className="text-xs text-muted-foreground">{formatDate(item.date)} · {item.channel ?? "Ghi chú"}</div>
              <div className="mt-1 text-sm">{item.text}</div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Chưa có lịch sử tương tác từ API comm-logs.
        </div>
      )}
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
