import { useState, type FormEvent } from "react";
import type React from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ProjectTask } from "@/features/deals/types";

const PHASE_RULES: { label: string; keywords: string[] }[] = [
  { label: "GIAI ĐOẠN 1: THIẾT KẾ", keywords: ["thiết kế", "wireframe", "mockup", "figma"] },
  { label: "GIAI ĐOẠN 2: PHÁT TRIỂN", keywords: ["phát triển", "cài đặt", "backend", "frontend", "api"] },
  { label: "GIAI ĐOẠN 3: KIỂM THỬ", keywords: ["kiểm thử", "test", "qa"] },
  { label: "GIAI ĐOẠN 4: TRIỂN KHAI", keywords: ["triển khai", "deploy", "release"] },
];

function detectPhase(title: string): string | null {
  const lower = title.toLowerCase();
  for (const rule of PHASE_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.label;
  }
  return null;
}

type TaskGroup = { phaseLabel: string | null; tasks: ProjectTask[] };

function groupTasks(tasks: ProjectTask[]): TaskGroup[] {
  const map = new Map<string | null, ProjectTask[]>();
  for (const task of tasks) {
    const phase = detectPhase(task.title);
    if (!map.has(phase)) map.set(phase, []);
    map.get(phase)!.push(task);
  }
  const result: TaskGroup[] = [];
  for (const rule of PHASE_RULES) {
    const grouped = map.get(rule.label);
    if (grouped) result.push({ phaseLabel: rule.label, tasks: grouped });
  }
  const ungrouped = map.get(null);
  if (ungrouped?.length) result.push({ phaseLabel: null, tasks: ungrouped });
  return result;
}

type ProjectTaskPanelProps = {
  tasks: ProjectTask[];
  onAddTask: (title: string, note: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<ProjectTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
};

export function ProjectTaskPanel({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleTask,
  onClick,
}: ProjectTaskPanelProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingNote, setEditingNote] = useState("");
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());

  function togglePhase(label: string) {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  function openAdd() {
    setAdding(true);
    setNewTitle("");
    setNewNote("");
  }

  function cancelAdd() {
    setAdding(false);
    setNewTitle("");
    setNewNote("");
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    // BE task hiện chỉ nhận title/note/is_done, nên form chỉ gửi đúng dữ liệu backend hỗ trợ.
    onAddTask(title, newNote.trim());
    cancelAdd();
  }

  function startEditing(task: ProjectTask) {
    setEditingId(task.id);
    setEditingTitle(task.title);
    setEditingNote(task.note ?? "");
  }

  function saveEditing(taskId: string) {
    const title = editingTitle.trim();
    if (!title) return;
    onUpdateTask(taskId, { title, note: editingNote.trim() });
    setEditingId(null);
    setEditingTitle("");
    setEditingNote("");
  }

  function confirmDelete(task: ProjectTask) {
    if (window.confirm(`Xóa công việc "${task.title}"?`)) {
      onDeleteTask(task.id);
    }
  }

  return (
    <>
      <section
        role="region"
        aria-labelledby="project-task-panel-title"
        onClick={onClick}
        className="flex max-h-[560px] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <header className="border-b border-border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div id="project-task-panel-title" className="flex items-center gap-2 font-semibold uppercase tracking-wide">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ClipboardCheck className="h-4 w-4" />
                </span>
                Công việc cần làm
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {completedCount}/{tasks.length} · {progress}% hoàn thành
              </p>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Thêm công việc
            </button>
          </div>
          <div
            role="progressbar"
            aria-label="Tiến độ công việc"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="mt-4 h-2 overflow-hidden rounded-full bg-primary/10"
          >
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tasks.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <div className="max-w-xs">
              <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <h3 className="mt-3 font-semibold">Chưa có công việc nào</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Thêm công việc đầu tiên để theo dõi tiến độ dự án.
              </p>
              <button
                type="button"
                onClick={openAdd}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Thêm công việc đầu tiên
              </button>
            </div>
          </div>
        ) : (() => {
            const groups = groupTasks(tasks);
            const isGrouped = groups.some((g) => g.phaseLabel !== null);
            if (!isGrouped) {
              return (
                <div className="divide-y divide-border">
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      editing={editingId === task.id}
                      editingTitle={editingTitle}
                      editingNote={editingNote}
                      onEditingTitleChange={setEditingTitle}
                      onEditingNoteChange={setEditingNote}
                      onStartEdit={() => startEditing(task)}
                      onCancelEdit={() => setEditingId(null)}
                      onSaveEdit={() => saveEditing(task.id)}
                      onToggle={(completed) => onToggleTask(task.id, completed)}
                      onDelete={() => confirmDelete(task)}
                    />
                  ))}
                </div>
              );
            }
            return (
              <div>
                {groups.map((group) => {
                  const label = group.phaseLabel;
                  const isCollapsed = label !== null && collapsedPhases.has(label);
                  return (
                    <div key={label ?? "__ungrouped__"}>
                      {label !== null && (
                        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {label}
                          </span>
                          <button
                            type="button"
                            aria-label={isCollapsed ? `Mở ${label}` : `Đóng ${label}`}
                            onClick={() => togglePhase(label)}
                            className="rounded p-1 text-muted-foreground hover:bg-secondary"
                          >
                            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                      {!isCollapsed && (
                        <div className="divide-y divide-border">
                          {group.tasks.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              editing={editingId === task.id}
                              editingTitle={editingTitle}
                              editingNote={editingNote}
                              onEditingTitleChange={setEditingTitle}
                              onEditingNoteChange={setEditingNote}
                              onStartEdit={() => startEditing(task)}
                              onCancelEdit={() => setEditingId(null)}
                              onSaveEdit={() => saveEditing(task.id)}
                              onToggle={(completed) => onToggleTask(task.id, completed)}
                              onDelete={() => confirmDelete(task)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </section>

      <Dialog
        open={adding}
        onOpenChange={(open) => {
          if (!open) cancelAdd();
        }}
      >
        <DialogContent className="p-0 sm:max-w-md" showCloseButton>
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </span>
              Thêm công việc
            </DialogTitle>
            <DialogDescription>
              Tạo một công việc mới cho dự án hiện tại.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            title={newTitle}
            note={newNote}
            onTitleChange={setNewTitle}
            onNoteChange={setNewNote}
            onCancel={cancelAdd}
            onSubmit={handleAdd}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function TaskForm({
  title,
  note,
  onTitleChange,
  onNoteChange,
  onCancel,
  onSubmit,
}: {
  title: string;
  note: string;
  onTitleChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 p-5">
      <input
        autoFocus
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        placeholder="Tên công việc"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />
      <textarea
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="Ghi chú"
        rows={3}
        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-45"
        >
          Lưu
        </button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium">
          Hủy
        </button>
      </div>
    </form>
  );
}

function TaskRow({
  task,
  editing,
  editingTitle,
  editingNote,
  onEditingTitleChange,
  onEditingNoteChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggle,
  onDelete,
}: {
  task: ProjectTask;
  editing: boolean;
  editingTitle: string;
  editingNote: string;
  onEditingTitleChange: (value: string) => void;
  onEditingNoteChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onToggle: (completed: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-start gap-2 px-4 py-3 hover:bg-muted/30">
      <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground" />
      <input
        type="checkbox"
        checked={task.completed}
        onChange={(event) => onToggle(event.target.checked)}
        aria-label={`Đánh dấu ${task.title} hoàn thành`}
        className="mt-1 h-4 w-4 shrink-0 accent-primary"
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={editingTitle}
                onChange={(event) => onEditingTitleChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onSaveEdit();
                  if (event.key === "Escape") onCancelEdit();
                }}
                aria-label="Sửa tên công việc"
                className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none"
              />
              <button type="button" onClick={onSaveEdit} aria-label="Lưu công việc" className="rounded-md p-1.5 text-success hover:bg-success/10">
                <Check className="h-4 w-4" />
              </button>
              <button type="button" onClick={onCancelEdit} aria-label="Hủy sửa công việc" className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={editingNote}
              onChange={(event) => onEditingNoteChange(event.target.value)}
              aria-label="Sửa ghi chú công việc"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none"
            />
          </div>
        ) : (
          <>
            <div className={cn("text-sm font-medium", task.completed && "text-muted-foreground line-through")}>
              {task.title}
            </div>
            {task.note && <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{task.note}</p>}
          </>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{task.completed ? "Hoàn thành" : "Chưa làm"}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={onStartEdit} aria-label={`Sửa ${task.title}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={onDelete} aria-label={`Xóa ${task.title}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
