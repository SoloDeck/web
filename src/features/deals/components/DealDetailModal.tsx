import { X, Mail, CreditCard, Clock, Construction, Lock } from "lucide-react";
import { formatVND } from "@/utils/format";
import type { Deal, ProjectTask } from "@/features/deals/types";
import { ProjectTaskPanel } from "@/features/deals/components/ProjectTaskList";
import { useDealStore } from "@/features/deals/hooks/useDealStore";
import {
  useProjectTasks,
  useAddTask,
  useToggleTask,
  useUpdateTask,
  useDeleteTask,
} from "@/features/deals/hooks/useProjectTasks";

const paymentColor = {
  "Chưa thanh toán": "bg-destructive/15 text-destructive",
  "Đã đặt cọc": "bg-warning/20 text-warning-foreground",
  "Đã thanh toán": "bg-success/15 text-success",
} as const;

function DevBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      <Construction className="h-2.5 w-2.5" /> Đang phát triển
    </span>
  );
}

export function DealDetailModal({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const storedDeal = useDealStore((state) =>
    deal ? state.deals.find((item) => item.id === deal.id) : undefined,
  );
  const selectedDeal = storedDeal ?? deal;
  const projectStageUnlocked =
    selectedDeal?.stage === "active" || selectedDeal?.stage === "completed_and_billed";

  const { data: taskData } = useProjectTasks(selectedDeal?.id, projectStageUnlocked);
  const projectId = taskData?.projectId ?? "";

  const addTaskMutation = useAddTask(selectedDeal?.id ?? "", projectId);
  const toggleTaskMutation = useToggleTask(selectedDeal?.id ?? "");
  const updateTaskMutation = useUpdateTask(selectedDeal?.id ?? "");
  const deleteTaskMutation = useDeleteTask(selectedDeal?.id ?? "");

  if (!selectedDeal) return null;

  function handleAddTask(title: string, note: string) {
    if (!projectId) return;
    addTaskMutation.mutate({ title, note });
  }

  function handleUpdateTask(taskId: string, patch: Partial<ProjectTask>) {
    if (patch.title !== undefined || patch.note !== undefined) {
      updateTaskMutation.mutate({ taskId, title: patch.title, note: patch.note });
    }
  }

  function handleDeleteTask(taskId: string) {
    deleteTaskMutation.mutate(taskId);
  }

  function handleToggleTask(taskId: string, completed: boolean) {
    toggleTaskMutation.mutate({ taskId, is_done: completed });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in lg:grid lg:place-items-center lg:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="deal-detail-title"
        className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-5 lg:h-[90vh] lg:flex-row lg:items-stretch"
      >
        <div
          role="region"
          aria-labelledby="deal-detail-title"
          onClick={(event) => event.stopPropagation()}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:h-full lg:max-h-none lg:min-w-0 lg:flex-1"
        >
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div>
            <div id="deal-detail-title" className="text-xs text-muted-foreground">Chi tiết Dự án</div>
            <div className="font-semibold">{selectedDeal.client}</div>
          </div>
          <button onClick={onClose} aria-label="Đóng chi tiết dự án" className="p-1.5 rounded-md hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          {/* Stats row — all from API */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Giá trị dự kiến</div>
              <div className="font-bold text-primary">{formatVND(selectedDeal.value)}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Liên hệ</div>
              <div className="font-semibold text-sm truncate">{selectedDeal.contact || "—"}</div>
            </div>
          </div>

          {/* Project info — from API */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tên dự án</div>
            <div className="text-sm font-medium">{selectedDeal.projectType}</div>
            {selectedDeal.notes && <div className="text-xs text-muted-foreground mt-1">{selectedDeal.notes}</div>}
          </div>

          {/* Payment — status from API, method = Đang phát triển */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              <CreditCard className="h-3 w-3" /> Thanh toán
            </div>
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className={`inline-flex text-xs font-semibold rounded-full px-2.5 py-0.5 ${paymentColor[selectedDeal.paymentStatus]}`}>
                  {selectedDeal.paymentStatus}
                </div>
                <DevBadge />
              </div>
              <div className="text-xs text-muted-foreground">
                Phương thức thanh toán và lịch sử giao dịch sẽ được đồng bộ sau.
              </div>
            </div>
          </div>

          {/* History — not in API yet */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
              <Clock className="h-3 w-3" /> Lịch sử tương tác
              <DevBadge />
            </div>
            {selectedDeal.history.length > 0 ? (
              <ol className="space-y-2.5 border-l-2 border-border pl-4">
                {selectedDeal.history.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                    <div className="text-xs text-muted-foreground">{h.date}</div>
                    <div className="text-sm">{h.text}</div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3 text-center">
                Lịch sử tương tác sẽ được hiển thị khi tính năng được phát triển.
              </div>
            )}
          </div>


        </div>

        <div className="flex shrink-0 gap-2 border-t border-border bg-card/95 px-6 py-4 backdrop-blur">
          <button className="flex-1 inline-flex items-center justify-center rounded-lg bg-success text-success-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-95">
            Nhắn Zalo
          </button>
          <button
            disabled={!selectedDeal.clientEmail}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-secondary text-secondary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Mail className="h-4 w-4" /> Email
          </button>
        </div>
        </div>

        {projectStageUnlocked ? (
          <ProjectTaskPanel
            tasks={taskData?.tasks ?? []}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onToggleTask={handleToggleTask}
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <section
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[560px] min-h-0 flex-col rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wide">Công việc chưa mở</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Task chỉ được tạo sau khi deal chuyển sang Đang triển khai và có project gắn với deal.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
