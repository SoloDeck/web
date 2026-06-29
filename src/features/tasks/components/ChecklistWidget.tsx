import { useState } from "react"
import type { FormEvent } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAddChecklistItem, useToggleChecklistItem } from "@/features/tasks/hooks/useTasks"
import type { ChecklistItemResponse } from "@/features/tasks/types"

type ChecklistWidgetProps = {
  taskId: string
  items: ChecklistItemResponse[]
}

export function ChecklistWidget({ taskId, items }: ChecklistWidgetProps) {
  const [text, setText] = useState("")
  const addItem = useAddChecklistItem(taskId)
  const toggleItem = useToggleChecklistItem(taskId)

  const sortedItems = [...items].sort((a, b) => a.position - b.position)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextText = text.trim()
    if (!nextText) return

    addItem.mutate(
      { text: nextText, position: sortedItems.length },
      { onSuccess: () => setText("") }
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground">Danh sách kiểm tra</div>
      <div className="space-y-2">
        {sortedItems.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-2 rounded-md border border-border bg-background p-2 text-sm"
          >
            <Checkbox
              checked={item.is_done}
              onCheckedChange={(checked) => {
                toggleItem.mutate({ itemId: item.id, is_done: checked === true })
              }}
              aria-label={item.text}
              className="mt-0.5"
            />
            <span
              className={cn(
                "min-w-0 flex-1 leading-5 text-foreground",
                item.is_done && "text-muted-foreground line-through"
              )}
            >
              {item.text}
            </span>
          </label>
        ))}
        {sortedItems.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            Chưa có mục kiểm tra.
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Thêm mục mới"
          aria-label="Thêm mục kiểm tra"
        />
        <Button type="submit" size="icon" disabled={addItem.isPending || !text.trim()}>
          <Plus />
          <span className="sr-only">Thêm mục kiểm tra</span>
        </Button>
      </form>
    </div>
  )
}
