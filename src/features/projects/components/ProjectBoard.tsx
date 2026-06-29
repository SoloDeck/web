import { useEffect, useMemo, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TaskListWidget } from "@/features/tasks/components/TaskListWidget"
import { useDeals } from "@/features/deals/hooks/useDeals"
import { useCreateProject, useProjects } from "@/features/projects/hooks/useProjects"
import type { ProjectStatus } from "@/features/projects/types"

type ProjectBoardProps = {
  dealId: string
}

const statusLabel: Record<ProjectStatus, string> = {
  planning: "Lên kế hoạch",
  active: "Đang chạy",
  on_hold: "Tạm dừng",
  completed: "Hoàn tất",
}

export function ProjectBoard({ dealId }: ProjectBoardProps) {
  const { deals } = useDeals()
  const { data: projects = [], isLoading: isProjectsLoading } = useProjects({ deal_id: dealId })
  const createProject = useCreateProject()
  const attemptedDealIdRef = useRef<string | null>(null)

  const deal = useMemo(() => deals.find((item) => item.id === dealId), [dealId, deals])
  const project = projects[0] ?? null

  useEffect(() => {
    if (!deal || deal.stage !== "active" || project || createProject.isPending) return
    if (attemptedDealIdRef.current === dealId) return

    attemptedDealIdRef.current = dealId
    createProject.mutate({
      deal_id: dealId,
      name: deal.projectType,
      description: deal.notes || null,
    })
  }, [createProject, deal, dealId, project])

  if (isProjectsLoading) {
    return <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Đang tải dự án...</div>
  }

  if (!project) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Dự án sẽ được tạo khi deal chuyển sang trạng thái đang triển khai.
      </div>
    )
  }

  const progressValue = project.task_count > 0 ? (project.done_count / project.task_count) * 100 : 0

  return (
    <Card className="rounded-lg">
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <CardTitle>{project.name}</CardTitle>
          {project.description && (
            <div className="mt-1 text-sm text-muted-foreground">{project.description}</div>
          )}
        </div>
        <Badge variant="secondary">{statusLabel[project.status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Tiến độ</span>
            <span className="text-muted-foreground">
              {project.done_count}/{project.task_count} công việc
            </span>
          </div>
          <Progress value={progressValue} />
        </div>

        <TaskListWidget entityType="projects" entityId={project.id} />
      </CardContent>
    </Card>
  )
}
