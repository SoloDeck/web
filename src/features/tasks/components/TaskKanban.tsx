import { useMemo, useState } from "react"
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CalendarDays, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { TaskDetailDrawer } from "@/features/tasks/components/TaskDetailDrawer"
import {
  useCreateTask,
  useTasks,
  useUpdateTaskStatus,
} from "@/features/tasks/hooks/useTasks"
import type { TaskEntityType } from "@/features/tasks/api/tasksService"
import type { Priority, TaskResponse, TaskStatus } from "@/features/tasks/types"

type TaskKanbanProps = {
  entityType: TaskEntityType
  entityId: string
}

const columns: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "Cần làm" },
  { id: "in_progress", title: "Đang làm" },
  { id: "review", title: "Chờ duyệt" },
  { id: "done", title: "Hoàn tất" },
]

const priorityLabel: Record<Priority, string> = {
  low: "Thấp",
  medium: "Vừa",
  high: "Cao",
}

const priorityClass: Record<Priority, string> = {
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  high: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

function TaskColumn({
  status,
  title,
  tasks,
  onOpenTask,
}: {
  status: TaskStatus
  title: string
  tasks: TaskResponse[]
  onOpenTask: (task: TaskResponse) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex min-w-[260px] flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[320px] flex-1 rounded-lg border-2 border-dashed p-2 transition-colors",
          isOver ? "border-primary bg-primary/5" : "border-border bg-muted/40"
        )}
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onOpen={() => onOpenTask(task)} />
            ))}
          </div>
        </SortableContext>
        {tasks.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">Kéo công việc vào đây</div>
        )}
      </div>
    </div>
  )
}

function TaskCard({ task, onOpen }: { task: TaskResponse; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className="w-full cursor-grab rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md active:cursor-grabbing"
    >
      <div className="line-clamp-2 text-sm font-medium text-card-foreground">{task.title}</div>
      {task.description && (
        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium",
            priorityClass[task.priority]
          )}
        >
          {priorityLabel[task.priority]}
        </span>
        {task.deadline && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="size-3" />
            {task.deadline}
          </span>
        )}
      </div>
    </button>
  )
}

export function TaskKanban({ entityType, entityId }: TaskKanbanProps) {
  const { data: tasks = [], isLoading, isError } = useTasks(entityType, entityId)
  const createTask = useCreateTask(entityType, entityId)
  const updateStatus = useUpdateTaskStatus()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null)
  const [newTitle, setNewTitle] = useState("")

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const activeTask = activeId ? tasks.find((task) => task.id === activeId) ?? null : null

  const tasksByStatus = useMemo(() => {
    return columns.reduce<Record<TaskStatus, TaskResponse[]>>(
      (result, column) => {
        result[column.id] = tasks.filter((task) => task.status === column.id)
        return result
      },
      { todo: [], in_progress: [], review: [], done: [] }
    )
  }, [tasks])

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const taskId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId) return

    const task = tasks.find((item) => item.id === taskId)
    if (!task) return

    const nextStatus = columns.some((column) => column.id === overId)
      ? (overId as TaskStatus)
      : tasks.find((item) => item.id === overId)?.status

    if (!nextStatus || nextStatus === task.status) return
    updateStatus.mutate({ taskId, status: nextStatus })
  }

  const onCreate = () => {
    const title = newTitle.trim()
    if (!title) return
    createTask.mutate(
      { title, priority: "medium" },
      { onSuccess: () => setNewTitle("") }
    )
  }

  if (isLoading) {
    return <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Đang tải công việc...</div>
  }

  if (isError) {
    return <div className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">Không thể tải công việc.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCreate()
          }}
          placeholder="Thêm công việc mới"
          aria-label="Thêm công việc mới"
        />
        <Button type="button" onClick={onCreate} disabled={createTask.isPending || !newTitle.trim()}>
          <Plus />
          Thêm
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((column) => (
            <TaskColumn
              key={column.id}
              status={column.id}
              title={column.title}
              tasks={tasksByStatus[column.id]}
              onOpenTask={(task) => setSelectedTask(task)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="rotate-2">
              <TaskCard task={activeTask} onOpen={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskDetailDrawer
        task={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null)
        }}
      />
    </div>
  )
}
