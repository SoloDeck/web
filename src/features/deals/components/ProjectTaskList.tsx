import { useState, type FormEvent, type MouseEvent } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type {
  ProjectTask,
} from "@/features/deals/types";
import { cn } from "@/lib/utils";

type ProjectTaskPanelProps = {
  tasks: ProjectTask[];
  onAddTask: (title: string, note: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<ProjectTask>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
};

export function ProjectTaskPanel({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleTask,
  onClick,
}: ProjectTaskPanelProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingNote, setEditingNote] = useState("");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(() => new Set());
  const [completedOpen, setCompletedOpen] = useState(true);

  const completedCount = tasks.filter((task) => task.completed).length;
  const incompleteTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const groupedTasks: Array<ProjectTask | "completed-header"> = [
    ...incompleteTasks,
    ...(completedTasks.length > 0 ? (["completed-header"] as const) : []),
    ...(completedOpen ? completedTasks : []),
  ];
  const progress = tasks.length === 0
    ? 0
    : Math.round((completedCount / tasks.length) * 100);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    onAddTask(title, newNote.trim());
    setNewTitle("");
    setNewNote("");
  }

  function toggleCompleted(task: ProjectTask, completed: boolean) {
    if (completed) setCompletedOpen(true);
    onToggleTask(task.id, completed);
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
    const confirmed = window.confirm(`Xóa công việc “${task.title}”?`);
    if (confirmed) onDeleteTask(task.id);
  }

  function toggleNote(taskId: string) {
    setExpandedNotes((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  return (
    <section
      role="region"
      aria-labelledby="project-task-panel-title"
      onClick={onClick}
      className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl lg:h-full lg:max-h-none lg:w-[400px] lg:max-w-none lg:shrink-0"
    >
      <div className="shrink-0 border-b border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div id="project-task-panel-title" className="flex items-center gap-2 font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                <ListTodo className="h-4 w-4" />
              </span>
              Công việc cần làm
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {completedCount}/{tasks.length} công việc đã hoàn thành
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {progress}%
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Tiến độ công việc"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <form onSubmit={handleAdd} className="mt-4 space-y-2">
          <div className="flex gap-2">
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Thêm công việc mới..."
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus className="h-4 w-4" /> Thêm
            </button>
          </div>
          <textarea
            value={newNote}
            onChange={(event) => setNewNote(event.target.value)}
            placeholder="Ghi chú công việc (không bắt buộc)..."
            rows={2}
            className="block w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-xs leading-relaxed outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
          />
        </form>
      </div>

      {tasks.length === 0 ? (
        <div className="m-4 grid min-h-36 flex-1 place-items-center rounded-xl border border-dashed border-primary/20 bg-primary/[0.03] px-4 py-6 text-center text-xs text-muted-foreground">
          Chưa có công việc nào cho dự án này.
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
          {groupedTasks.map((item) => item === "completed-header" ? (
            <li key="completed-group-header" className="border-t border-border pt-3">
              <button
                type="button"
                aria-expanded={completedOpen}
                onClick={() => setCompletedOpen((open) => !open)}
                className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>Hoàn thành {completedCount}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    completedOpen && "rotate-180",
                  )}
                />
              </button>
            </li>
          ) : (
            <li
              key={`${item.id}-${item.completed ? "done" : "open"}`}
              className={cn(
                "animate-in rounded-lg border border-border bg-card p-3 fade-in duration-200",
                item.completed ? "slide-in-from-top-1 opacity-65" : "slide-in-from-bottom-1",
              )}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(event) => toggleCompleted(item, event.target.checked)}
                  aria-label={`Đánh dấu ${item.title} hoàn thành`}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />

                <div className="min-w-0 flex-1">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editingTitle}
                          onChange={(event) => setEditingTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveEditing(item.id);
                            if (event.key === "Escape") setEditingId(null);
                          }}
                          aria-label="Sửa tên công việc"
                          className="min-w-0 flex-1 rounded-md border border-primary/30 bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          type="button"
                          onClick={() => saveEditing(item.id)}
                          disabled={!editingTitle.trim()}
                          aria-label="Lưu công việc"
                          className="rounded-md p-1.5 text-success hover:bg-success/10 disabled:opacity-40"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          aria-label="Hủy sửa công việc"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <textarea
                        value={editingNote}
                        onChange={(event) => setEditingNote(event.target.value)}
                        aria-label="Sửa ghi chú công việc"
                        placeholder="Ghi chú công việc (không bắt buộc)..."
                        rows={3}
                        className="block w-full resize-y rounded-md border border-primary/30 bg-background px-2 py-1.5 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  ) : (
                    <>
                      <p
                        className={cn(
                          "line-clamp-2 break-words text-sm leading-relaxed [overflow-wrap:anywhere]",
                          item.completed && "text-muted-foreground line-through decoration-1",
                        )}
                      >
                        {item.title}
                      </p>
                      {(item.note ?? "").trim() && (
                        <div className="mt-1.5">
                          <p
                            className={cn(
                              "whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]",
                              !expandedNotes.has(item.id) && "line-clamp-2",
                            )}
                          >
                            {item.note}
                          </p>
                          {isLongNote(item.note) && (
                            <button
                              type="button"
                              onClick={() => toggleNote(item.id)}
                              className="mt-1 text-[11px] font-medium text-primary hover:underline"
                            >
                              {expandedNotes.has(item.id) ? "Thu gọn" : "Xem thêm"}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        item.completed
                          ? "border-success/20 bg-success/10 text-success"
                          : "border-border bg-muted/60 text-muted-foreground",
                      )}
                    >
                      {item.completed ? "Hoàn thành" : "Chưa làm"}
                    </span>
                    <span aria-hidden="true" className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground">
                      {item.completed
                        ? item.completedAt
                          ? `Xong lúc ${formatTaskTime(item.completedAt)}`
                          : "Đã hoàn thành"
                        : item.createdAt
                          ? `Tạo lúc ${formatTaskTime(item.createdAt)}`
                          : "Chưa có thời gian tạo"}
                    </span>
                    {item.dueDate && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        Hạn {formatDueDate(item.dueDate)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    aria-label={`Sửa ${item.title}`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(item)}
                    aria-label={`Xóa ${item.title}`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function isLongNote(value: string): boolean {
  return value.length > 90 || value.split(/\r?\n/).length > 2;
}

function formatDueDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatTaskTime(value: string): string {
  const date = new Date(value);
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  const day = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  return `${time} ${day}`;
}
