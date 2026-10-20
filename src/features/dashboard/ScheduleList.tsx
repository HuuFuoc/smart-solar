import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { StatusBadge, type StatusVariant } from '@/components/common/stitch-ui/StatusBadge'
import { cn } from '@/utils/cn'

/* Khối "Upcoming Schedule (3-Day)" trong technician_dashboard_1: nhóm theo ngày, mỗi việc là một hàng. */
export type ScheduleRowTone = 'primary' | 'secondary'

export type ScheduleRow = {
  id: string
  icon: string
  iconTone: ScheduleRowTone
  title: string
  /** Khách hàng, địa chỉ */
  subtitle: string
  time: string
  /** Ghi chú dưới giờ, ví dụ "Plans On-Site" */
  detail: string
  badge: { label: string; variant: StatusVariant }
}

export type ScheduleDay = {
  id: string
  /** "Tomorrow, Thu Oct 24" */
  label: string
  /** primary cho ngày gần nhất, default cho các ngày sau */
  tone?: 'primary' | 'default'
  /** "2 Inspections, 1 Comm Check" */
  note: string
  rows: ScheduleRow[]
}

const rowIconClasses: Record<ScheduleRowTone, string> = {
  primary: 'bg-surface-container-highest text-primary',
  secondary: 'bg-secondary-fixed text-on-secondary-fixed-variant',
}

export type ScheduleListProps = {
  days: ScheduleDay[]
  className?: string
}

export function ScheduleList({ days, className }: ScheduleListProps) {
  return (
    <Card padding="md" className={cn('flex flex-col', className)}>
      {days.map((day, index) => (
        <div
          key={day.id}
          className={cn(
            'flex flex-col',
            index > 0 && 'pt-space-md',
            index < days.length - 1 && 'pb-space-md',
          )}
        >
          <div className="mb-space-sm flex flex-wrap items-center gap-space-xs">
            <span
              className={cn(
                'text-label-md font-bold',
                day.tone === 'default' ? 'text-on-surface' : 'text-primary',
              )}
            >
              {day.label}
            </span>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-outline-variant" />
            <span className="text-label-sm text-on-surface-variant">{day.note}</span>
          </div>

          <ul className="flex flex-col gap-space-xs">
            {day.rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between rounded-xl bg-surface-container-low p-space-sm transition-colors hover:bg-surface-container"
              >
                <div className="flex min-w-0 items-center gap-space-sm">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      rowIconClasses[row.iconTone],
                    )}
                  >
                    <Icon name={row.icon} className="text-[20px]" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-label-lg font-bold text-on-surface">{row.title}</span>
                    <span className="truncate text-body-sm text-on-surface-variant">{row.subtitle}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-space-md">
                  <div className="hidden flex-col text-right sm:flex">
                    <span className="text-label-sm font-semibold text-on-surface">{row.time}</span>
                    <span className="text-body-sm text-on-surface-variant">{row.detail}</span>
                  </div>
                  <StatusBadge variant={row.badge.variant} size="sm" dot={false} className="font-semibold">
                    {row.badge.label}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  )
}
