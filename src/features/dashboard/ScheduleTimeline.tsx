import { Link } from 'react-router'
import { LegendItem } from '@/components/common/charts/ChartPanel'
import { dayChip, relativeDay } from '@/features/scheduling/schedulingDisplay'
import { daysTouched } from '@/features/dashboard/dashboardStats'
import { whenText } from '@/features/dashboard/whenText'
import { cx } from '@/utils/cx'

export type TimelineItem = {
  key: string
  label: string
  sublabel?: string
  startsAt: string
  endsAt: string
  color: string
  /** Tên nhóm màu, đọc ở chú giải và trong nhãn cho trình đọc màn hình */
  group: string
  href?: string
}

// Lịch dạng dòng thời gian: màn rộng là bảng ngày (mỗi dòng một việc, thanh trải các ngày việc chạm vào); màn hẹp là danh sách
// theo ngày, vì thanh ngang trên điện thoại khó đọc hơn một danh sách lịch
export function ScheduleTimeline({
  items,
  days,
  today,
  legend,
  emptyText = 'Không có lịch trong khoảng này.',
}: {
  items: TimelineItem[]
  /** Các ngày YYYY-MM-DD liên tiếp của trục */
  days: string[]
  today: string
  legend: { label: string; color: string }[]
  emptyText?: string
}) {
  const rows = items
    .map((item) => ({ item, touched: daysTouched(item.startsAt, item.endsAt, days) }))
    .filter((r) => r.touched.length > 0)
    .sort((a, b) => a.item.startsAt.localeCompare(b.item.startsAt))

  if (rows.length === 0)
    return (
      <p className="rounded-control border border-dashed border-line-2 px-4 py-8 text-center text-body text-fg-2">
        {emptyText}
      </p>
    )

  const byDay = days
    .map((d) => ({ day: d, rows: rows.filter((r) => r.touched.includes(d)) }))
    .filter((d) => d.rows.length > 0)

  return (
    <div>
      {legend.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {legend.map((l) => (
            <LegendItem key={l.label} color={l.color} label={l.label} />
          ))}
        </ul>
      )}

      {/* Màn rộng: bảng ngày */}
      <div className="hidden md:block">
        <div
          className="grid text-meta"
          style={{ gridTemplateColumns: `minmax(10rem, 14rem) repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div />
          {days.map((d) => {
            const chip = dayChip(d)
            return (
              <div
                key={d}
                className={cx(
                  'border-b border-line pb-1 text-center',
                  d === today ? 'font-semibold text-fg' : chip.isSunday ? 'text-fg-3' : 'text-fg-2',
                )}
              >
                <span className="block">{chip.weekday}</span>
                <span className="tnum block">{chip.date}</span>
              </div>
            )
          })}
          {rows.map(({ item, touched }) => {
            const first = days.indexOf(touched[0]!)
            const span = touched.length
            const name = (
              <>
                <span className="block truncate text-body text-fg">{item.label}</span>
                {item.sublabel && <span className="block truncate text-fg-3">{item.sublabel}</span>}
              </>
            )
            return (
              <div key={item.key} className="contents">
                <div className="min-w-0 border-b border-line py-1.5 pr-3">
                  {item.href ? (
                    <Link to={item.href} className="block hover:underline">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </div>
                <div
                  className="relative border-b border-line"
                  style={{ gridColumn: `${2} / span ${days.length}` }}
                  aria-label={`${item.label}: ${item.group}, ${relativeDay(touched[0]!, today)}${span > 1 ? ` tới ${relativeDay(touched[span - 1]!, today)}` : ''}, ${whenText(item.startsAt, item.endsAt)}`}
                  role="img"
                >
                  <span
                    className="absolute top-1/2 h-3 -translate-y-1/2 rounded-control"
                    style={{
                      left: `calc(${(first / days.length) * 100}% + 3px)`,
                      width: `calc(${(span / days.length) * 100}% - 6px)`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Màn hẹp: danh sách theo ngày */}
      <ol className="space-y-3 md:hidden">
        {byDay.map(({ day, rows: dayRows }) => (
          <li key={day}>
            <p className={cx('mb-1 text-meta font-semibold', day === today ? 'text-fg' : 'text-fg-2')}>
              {relativeDay(day, today)}
            </p>
            <ul className="space-y-1">
              {dayRows.map(({ item }) => {
                const body = (
                  <>
                    <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: item.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-body text-fg">{item.label}</span>
                      <span className="block text-meta text-fg-3">
                        {item.group}, {whenText(item.startsAt, item.endsAt)}
                        {item.sublabel ? `, ${item.sublabel}` : ''}
                      </span>
                    </span>
                  </>
                )
                return (
                  <li key={item.key}>
                    {item.href ? (
                      <Link to={item.href} className="-mx-2 flex gap-2 rounded-control px-2 py-1 hover:bg-hover">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex gap-2 py-1">{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
