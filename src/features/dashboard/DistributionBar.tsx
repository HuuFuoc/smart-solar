import { cn } from '@/utils/cn'

/* "User Distribution" trong admin_dashboard: thanh xếp chồng + chú giải. */
export type DistributionSegment = {
  key: string
  label: string
  count: number
  percent: number
  /** Class màu nền, ví dụ bg-primary */
  colorClass: string
}

export type DistributionBarProps = {
  segments: DistributionSegment[]
  className?: string
}

export function DistributionBar({ segments, className }: DistributionBarProps) {
  return (
    <div className={className}>
      <div className="mb-space-md flex h-4 w-full overflow-hidden rounded-full bg-surface-container-highest">
        {segments.map((segment) => (
          <div
            key={segment.key}
            title={`${segment.label}: ${segment.percent}%`}
            className={cn('h-full', segment.colorClass)}
            style={{ width: `${segment.percent}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-2 text-body-sm">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full', segment.colorClass)} />
              <span className="text-on-surface">{segment.label}</span>
            </div>
            <span className="font-semibold text-on-surface">
              {segment.count.toLocaleString()} ({segment.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
