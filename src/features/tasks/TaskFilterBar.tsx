import { Card } from '@/components/common/stitch-ui/Card'
import { FilterChip, SearchInput } from '@/components/common/stitch-ui/FilterBar'
import { cn } from '@/utils/cn'

/* Thanh lọc trong my_tasks_1: hàng chip thời gian + ưu tiên, hàng omnibar + chip loại việc. */
export type TaskBucket = { key: string; label: string; count?: number }
export type TaskPriorityFilter = { key: string; label: string; tone?: 'default' | 'error' }
export type TaskTypeFilter = { key: string; label: string; icon?: string; iconClassName?: string }

export type TaskFilterValue = {
  bucket: string
  priority: string
  type: string
  search: string
}

export type TaskFilterBarProps = {
  buckets: TaskBucket[]
  priorities: TaskPriorityFilter[]
  types: TaskTypeFilter[]
  priorityLabel: string
  searchPlaceholder: string
  searchShortcut: string
  value: TaskFilterValue
  onChange: (next: TaskFilterValue) => void
  className?: string
}

export function TaskFilterBar({
  buckets,
  priorities,
  types,
  priorityLabel,
  searchPlaceholder,
  searchShortcut,
  value,
  onChange,
  className,
}: TaskFilterBarProps) {
  const update = (patch: Partial<TaskFilterValue>) => onChange({ ...value, ...patch })

  return (
    <Card padding="md" className={cn('flex flex-col gap-space-md', className)}>
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex flex-wrap items-center gap-space-2xs">
          {buckets.map((bucket) => (
            <FilterChip
              key={bucket.key}
              shape="pill"
              label={bucket.label}
              count={bucket.count}
              active={value.bucket === bucket.key}
              onClick={() => update({ bucket: bucket.key })}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-space-xs">
          <span className="text-label-sm text-on-surface-variant">{priorityLabel}</span>
          {priorities.map((priority) => (
            <FilterChip
              key={priority.key}
              label={priority.label}
              tone={priority.tone}
              active={value.priority === priority.key}
              onClick={() => update({ priority: priority.key })}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-space-md lg:flex-row">
        <SearchInput
          size="md"
          placeholder={searchPlaceholder}
          shortcutHint={searchShortcut}
          value={value.search}
          onChange={(event) => update({ search: event.target.value })}
          className="w-full shrink-0 lg:w-96"
        />
        <div className="flex w-full items-center gap-space-xs overflow-x-auto py-0.5">
          {types.map((type) => (
            <FilterChip
              key={type.key}
              label={type.label}
              icon={type.icon}
              iconClassName={type.iconClassName}
              active={value.type === type.key}
              onClick={() => update({ type: type.key })}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}
