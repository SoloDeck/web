import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Calendar, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ChecklistWidget } from "@/features/tasks/components/ChecklistWidget"
import { useUpdateTask } from "@/features/tasks/hooks/useTasks"
import type { Priority, TaskResponse } from "@/features/tasks/types"

type TaskDetailDrawerProps = {
  task: TaskResponse | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const priorityOptions: { value: Priority; label: string }[] = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Vừa" },
  { value: "high", label: "Cao" },
]

export function TaskDetailDrawer({ task, open, onOpenChange }: TaskDetailDrawerProps) {
  const updateTask = useUpdateTask()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? "")
    setDeadline(task.deadline ?? "")
    setPriority(task.priority)
  }, [task])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!task || !title.trim()) return

    updateTask.mutate(
      {
        taskId: task.id,
        body: {
          title: title.trim(),
          description: description.trim() || null,
          deadline: deadline || null,
          priority,
        },
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Chi tiết công việc</SheetTitle>
          <SheetDescription>Cập nhật nội dung, hạn chót và mức ưu tiên.</SheetDescription>
        </SheetHeader>

        {task && (
          <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-4 pb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="task-title">
                Tiêu đề
              </label>
              <Input
                id="task-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="task-description">
                Mô tả
              </label>
              <Textarea
                id="task-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="task-deadline">
                  Hạn chót
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="task-deadline"
                    type="date"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="task-priority">
                  Ưu tiên
                </label>
                <Select
                  items={priorityOptions}
                  value={priority}
                  onValueChange={(value) => setPriority(value as Priority)}
                >
                  <SelectTrigger id="task-priority" className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ChecklistWidget taskId={task.id} items={task.checklist_items} />

            <SheetFooter className="px-0 pb-0">
              <Button type="submit" disabled={updateTask.isPending || !title.trim()}>
                <Save />
                Lưu thay đổi
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
