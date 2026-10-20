import { cn } from '@/utils/cn'

/*
 * Hàng tiêu đề của mỗi khối trong technician_dashboard_1:
 * h2 headline-lg bold + ngày tháng body-md bên trái, ghi chú label-sm bên phải.
 */
export type SectionHeadingProps = {
  title: string
  /** Chữ nhỏ cạnh tiêu đề, ví dụ "Wednesday, Oct 23" */
  subtitle?: string
  /** Ghi chú góc phải, ví dụ "Ordered by Schedule" */
  meta?: string
  metaTone?: 'primary' | 'muted'
  metaUppercase?: boolean
  className?: string
}

export function SectionHeading({
  title,
  subtitle,
  meta,
  metaTone = 'primary',
  metaUppercase = false,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('flex items-center justify-between gap-space-sm', className)}>
      <div className="flex flex-wrap items-baseline gap-space-sm">
        <h2 className="text-headline-lg font-bold text-on-surface">{title}</h2>
        {subtitle && <span className="text-body-md text-on-surface-variant">{subtitle}</span>}
      </div>
      {meta && (
        <span
          className={cn(
            'shrink-0 text-label-sm font-semibold',
            metaTone === 'primary' ? 'text-primary' : 'text-on-surface-variant',
            metaUppercase && '',
          )}
        >
          {meta}
        </span>
      )}
    </div>
  )
}
