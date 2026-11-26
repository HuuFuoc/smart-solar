import { WEEK_DAYS_IN_ORDER, formatDay, formatTime, todayVn } from '@/features/scheduling/schedulingDisplay'
import type { DayEntry } from '@/features/scheduling/workCalendar'
import { cx } from '@/utils/cx'

/** Số việc hiện trong một ô của lịch tháng; phần còn lại gom vào "+N việc" dẫn sang xem ngày */
const MONTH_CELL_LIMIT = 3

function WorkChip({ entry, onOpen }: { entry: DayEntry; onOpen: () => void }) {
  const { item, continued } = entry
  const when = continued ? 'Tiếp tục:' : formatTime(item.startsAt)
  const text = `${item.done ? 'Đã xong: ' : ''}${when} ${item.title}`
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${text}, ${formatTime(item.startsAt)} đến ${formatTime(item.endsAt)}. Mở chi tiết ngày`}
      className="sv-cal-chip"
      data-kind={item.kind}
      data-done={item.done}
    >
      {text}
    </button>
  )
}

// Lịch tháng / tuần: mỗi ô một ngày. Cuộn ngang trên màn hẹp vì bảy cột không vừa
export function WorkCalendarGrid({
  days,
  entries,
  month,
  expanded,
  onOpenDay,
}: {
  days: string[]
  entries: Map<string, DayEntry[]>
  /** Tháng đang xem (YYYY-MM) để làm nhạt ngày của tháng khác; bỏ trống ở lịch tuần */
  month?: string
  /** Lịch tuần: hiện hết việc trong ô */
  expanded?: boolean
  onOpenDay: (day: string) => void
}) {
  const today = todayVn()
  return (
    <div className="sv-cal overflow-x-auto">
      <div className="min-w-224">
        <div className="sv-cal-head">
          {WEEK_DAYS_IN_ORDER.map((d) => (
            <div key={d.weekday}>{d.name}</div>
          ))}
        </div>
        <div className="sv-cal-grid">
          {days.map((day) => {
            const list = entries.get(day) ?? []
            const shown = expanded ? list : list.slice(0, MONTH_CELL_LIMIT)
            const hidden = list.length - shown.length
            const outside = month !== undefined && !day.startsWith(month)
            const isToday = day === today
            return (
              <div
                key={day}
                role="group"
                aria-label={`${formatDay(day, { year: true })}, ${list.length} việc`}
                className="sv-cal-cell"
                data-out={outside}
                data-today={isToday}
                data-tall={expanded}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDay(day)}
                    className={cx('press tnum rounded-control text-body font-medium', isToday ? 'text-ok' : 'text-fg')}
                  >
                    {Number(day.slice(8))}
                    {Number(day.slice(8)) === 1 && !expanded && (
                      <span className="text-meta font-normal"> Th {Number(day.slice(5, 7))}</span>
                    )}
                    <span className="sr-only"> Xem ngày {formatDay(day, { year: true })}</span>
                  </button>
                  {isToday ? (
                    <span className="sv-tag" data-tone="ok">
                      Hôm nay
                    </span>
                  ) : (
                    list.length > 0 && <span className="text-meta text-fg-3">{list.length} việc</span>
                  )}
                </div>
                {shown.map((entry) => (
                  <WorkChip key={`${entry.item.kind}-${entry.item.id}`} entry={entry} onOpen={() => onOpenDay(day)} />
                ))}
                {hidden > 0 && (
                  <button type="button" onClick={() => onOpenDay(day)} className="press text-left text-meta ui-link">
                    +{hidden} việc nữa
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
