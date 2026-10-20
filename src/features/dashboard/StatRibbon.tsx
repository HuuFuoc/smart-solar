import { useState } from 'react'
import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

/* Dải "Quick Status / Daily Metrics" đầu technician_dashboard_1: 4 ô số liệu + trạng thái điều phối. */
export type StatTileTone = 'primary' | 'neutral' | 'secondary' | 'success'

export type StatRibbonItem = {
  key: string
  icon: string
  value: string
  label: string
  tone: StatTileTone
}

const tileIconClasses: Record<StatTileTone, string> = {
  primary: 'bg-primary-container/10 text-primary',
  neutral: 'bg-surface-container-highest text-primary',
  secondary: 'bg-secondary-container/20 text-secondary',
  success: 'bg-primary-fixed text-on-primary-fixed',
}

export type StatRibbonProps = {
  stats: StatRibbonItem[]
  /** Nhãn đơn vị đang trực, ví dụ "Service Unit 12" */
  unitLabel: string
  /** Nhãn khi sẵn sàng nhận việc */
  readyLabel: string
  /** Nhãn khi bấm chuyển sang nghỉ/di chuyển */
  busyLabel: string
  className?: string
}

export function StatRibbon({ stats, unitLabel, readyLabel, busyLabel, className }: StatRibbonProps) {
  const [ready, setReady] = useState(true)

  return (
    <Card
      padding="md"
      className={cn(
        'flex flex-col items-stretch justify-between gap-space-md xl:flex-row xl:items-center',
        className,
      )}
    >
      <div className="grid flex-1 grid-cols-2 gap-space-sm md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="flex items-center gap-space-sm rounded-xl bg-surface-container-low p-space-sm"
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                tileIconClasses[stat.tone],
              )}
            >
              <Icon name={stat.icon} className="text-[24px]" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-headline-lg font-bold leading-none text-on-surface">{stat.value}</span>
              <span className="truncate text-label-sm text-on-surface-variant">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-space-md pl-space-xs pt-space-xs xl:justify-end xl:pt-0">
        <div className="flex items-center gap-space-xs">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary-container" />
          <span className="text-label-md font-semibold text-on-surface">{unitLabel}</span>
        </div>
        <button
          type="button"
          aria-pressed={ready}
          onClick={() => setReady((value) => !value)}
          className={cn(
            'flex items-center gap-space-xs whitespace-nowrap rounded-full px-space-md py-2.5 text-label-md shadow-sm transition-all',
            ready
              ? 'bg-primary text-on-primary hover:bg-primary-container'
              : 'bg-surface-container-highest text-on-surface hover:bg-surface-container',
          )}
        >
          <Icon name="radio_button_checked" className="text-[18px]" />
          <span>{ready ? readyLabel : busyLabel}</span>
        </button>
      </div>
    </Card>
  )
}
