import { TaskKanban } from "@/features/tasks/components/TaskKanban"
import type { TaskEntityType } from "@/features/tasks/api/tasksService"

type TaskListWidgetProps = {
  entityType: TaskEntityType
  entityId: string
}

export function TaskListWidget({ entityType, entityId }: TaskListWidgetProps) {
  return <TaskKanban entityType={entityType} entityId={entityId} />
}
