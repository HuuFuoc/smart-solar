import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

/* Thẻ trong khối "Recently Completed" của technician_dashboard_1. */
export type CompletedTask = {
  id: string
  title: string
  address: string
  /** "Today, 08:15 AM" */
  timestamp: string
  /** "18 Photos Uploaded" */
  evidence: string
  /** "Customer Signed" */
  verification: string
}

export type CompletedTaskCardProps = {
  task: CompletedTask
  className?: string
}

export function CompletedTaskCard({ task, className }: CompletedTaskCardProps) {
  return (
    <Card padding="md" className={cn('flex flex-col', className)}>
      <div className="flex items-start justify-between gap-space-xs">
        <div className="flex min-w-0 items-center gap-space-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary">
            <Icon name="check_circle" className="text-[18px]" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-label-lg font-bold text-on-surface">{task.title}</span>
            <span className="text-body-sm text-on-surface-variant">{task.address}</span>
          </div>
        </div>
        <span className="shrink-0 text-right text-label-sm text-on-surface-variant">{task.timestamp}</span>
      </div>

      <div className="mt-space-sm flex items-center justify-between gap-space-xs rounded-xl bg-surface-container-low px-space-sm py-2 pt-space-xs">
        <div className="flex items-center gap-space-xs text-label-sm text-on-surface-variant">
          <Icon name="photo_library" className="text-[16px] text-primary" />
          <span>{task.evidence}</span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-label-sm font-bold text-primary">
          <Icon name="done_all" className="text-[14px]" />
          {task.verification}
        </span>
      </div>
    </Card>
  )
}
