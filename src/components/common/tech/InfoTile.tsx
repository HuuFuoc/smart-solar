import { Icon } from '@/components/common/stitch-ui'
import { cn } from '@/utils/cn'

// Ô thông tin có icon, nhãn, giá trị và dòng phụ
export type InfoTileData = {
  icon: string
  label: string
  value: string
  /** Dòng phụ dưới giá trị */
  hint?: string
  /** primary = dòng phụ tô màu primary đậm ("T+4h 15m on site") */
  hintTone?: 'default' | 'primary'
  /** Màu ô icon; mặc định primary */
  tone?: 'primary' | 'secondary' | 'error'
  /** tile: icon bên trái, stacked: icon cạnh nhãn, giá trị nằm dưới */
  layout?: 'tile' | 'stacked'
}

const toneClasses = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  error: 'text-error',
} as const

export function InfoTile({
  icon,
  label,
  value,
  hint,
  hintTone = 'default',
  tone = 'primary',
  layout = 'tile',
}: InfoTileData) {
  if (layout === 'stacked') {
    return (
      <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-space-md">
        <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
          <Icon name={icon} className={cn('text-[16px]', toneClasses[tone])} />
          {label}
        </span>
        <span className="truncate text-label-lg font-bold text-on-surface">{value}</span>
        {hint && (
          <span
            className={cn(
              'text-body-sm',
              hintTone === 'primary' ? 'font-semibold text-primary' : 'text-on-surface-variant',
            )}
          >
            {hint}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-start gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest shadow-sm',
          toneClasses[tone],
        )}
      >
        <Icon name={icon} className="text-[20px]" />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="text-label-sm font-medium text-on-surface-variant">{label}</span>
        <span className="truncate text-label-md font-bold text-on-surface">{value}</span>
        {hint && (
          <span
            className={cn(
              'truncate text-body-sm',
              hintTone === 'primary' ? 'font-semibold text-primary' : 'text-on-surface-variant',
            )}
          >
            {hint}
          </span>
        )}
      </div>
    </div>
  )
}

export type InfoTileGridProps = {
  items: InfoTileData[]
  /** Số cột từ breakpoint xl; thiết kế dùng 4 (installation) hoặc 3 */
  columns?: 3 | 4
  className?: string
}

const columnClasses = { 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4' } as const

export function InfoTileGrid({ items, columns = 4, className }: InfoTileGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-space-sm md:grid-cols-2', columnClasses[columns], className)}>
      {items.map((item) => (
        <InfoTile key={item.label} {...item} />
      ))}
    </div>
  )
}
