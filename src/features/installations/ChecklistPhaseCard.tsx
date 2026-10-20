import { Card, ChecklistItem, Icon } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'

/*
 * Một phase của installation_task_checklist: ô icon 36px theo tông của phase,
 * tiêu đề + mô tả, badge tiến độ "3 of 3 Verified" và danh sách bước dùng ChecklistItem.
 */
export type ChecklistPhaseTone = 'safety' | 'execution' | 'audit'

export type ChecklistTaskItem = {
  id: string
  title: string
  description?: string
  /** Chữ bên phải khi đã tick ("Verified 13:05", "Complete") */
  doneText: string
  /** Chữ bên phải khi chưa tick ("Pending", "Queue next") */
  pendingText: string
  /** Bước đang làm: viền primary + thanh tiến độ phụ */
  active?: boolean
  activeLabel?: string
  progress?: { value: number; leftText: string; rightText: string }
  defaultChecked: boolean
}

const toneClasses: Record<ChecklistPhaseTone, { box: string; badge: string }> = {
  safety: {
    box: 'bg-primary-fixed text-primary',
    badge: 'bg-primary-fixed text-on-primary-fixed-variant',
  },
  execution: {
    box: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    badge: 'bg-secondary-fixed text-on-secondary-fixed',
  },
  audit: {
    box: 'bg-surface-container-high text-primary',
    badge: 'bg-primary-fixed text-on-primary-fixed-variant',
  },
}

export type ChecklistPhaseCardProps = {
  icon: string
  tone: ChecklistPhaseTone
  title: string
  description?: string
  /** Nội dung badge góc phải; mặc định suy ra từ số bước đã tick */
  badgeLabel: string
  badgeIcon?: string
  tasks?: ChecklistTaskItem[]
  checkedIds?: string[]
  onToggle?: (id: string, checked: boolean) => void
  /** Nội dung thay danh sách bước (lưới ảnh của phase 3) */
  children?: React.ReactNode
  className?: string
}

export function ChecklistPhaseCard({
  icon,
  tone,
  title,
  description,
  badgeLabel,
  badgeIcon,
  tasks = [],
  checkedIds = [],
  onToggle,
  children,
  className,
}: ChecklistPhaseCardProps) {
  const t = toneClasses[tone]

  return (
    <Card padding="lg" className={cn('flex flex-col', className)}>
      <div className="mb-space-md flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex min-w-0 items-center gap-space-sm">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', t.box)}>
            <Icon name={icon} className="text-[22px]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-headline-md font-bold text-on-surface">{title}</h2>
            <p className="text-body-sm text-on-surface-variant">{description}</p>
          </div>
        </div>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-label-sm font-bold',
            t.badge,
          )}
        >
          {badgeIcon && <Icon name={badgeIcon} className="text-[14px]" />}
          {badgeLabel}
        </span>
      </div>

      {tasks.length > 0 && (
        <div className="flex flex-col gap-space-xs">
          {tasks.map((task) => {
            const checked = checkedIds.includes(task.id)
            return (
              <ChecklistItem
                key={task.id}
                id={task.id}
                checked={checked}
                onCheckedChange={(value) => onToggle?.(task.id, value)}
                title={task.title}
                description={task.description}
                state={task.active && !checked ? 'active' : checked ? 'done' : 'pending'}
                status={task.active && !checked ? task.activeLabel : checked ? task.doneText : task.pendingText}
                progress={task.active && !checked ? task.progress : undefined}
              />
            )
          })}
        </div>
      )}

      {children}
    </Card>
  )
}
