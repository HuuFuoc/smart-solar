import { cx } from '@/utils/cx'
import { formatDay, weekdayStyle, type WeekdayStyle } from './schedulingDisplay'

export type WeekdayBadgeFormat = 'short' | 'name' | 'full'

/** Huy hiệu màu phân biệt 7 ngày trong tuần từ Thứ Hai đến Chủ Nhật */
export function WeekdayBadge({
  date,
  format = 'short',
  withBar = false,
  className,
}: {
  date: string | Date
  format?: WeekdayBadgeFormat
  withBar?: boolean
  className?: string
}) {
  const style: WeekdayStyle = weekdayStyle(date)
  const dayStr = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null

  let label = style.shortLabel
  if (format === 'name') {
    label = style.name
  } else if (format === 'full') {
    label = dayStr ? formatDay(dayStr) : style.name
  }

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5 text-meta font-semibold select-none shrink-0',
        style.row,
        className,
      )}
    >
      {withBar && (
        <span className={cx('inline-block h-3 w-1 rounded-control shrink-0', style.bar)} aria-hidden="true" />
      )}
      <span>{label}</span>
    </span>
  )
}
