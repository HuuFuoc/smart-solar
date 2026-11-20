import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatCount } from '@/components/common/charts/chartTheme'
import { cx } from '@/utils/cx'

export type BarListItem = {
  key: string
  label: string
  value: number
  color: string
  /** Số phụ bên phải (vd. số hồ sơ khi thanh là số tiền) */
  note?: ReactNode
  href?: string
}

// Thanh ngang xếp hạng: mỗi dòng tên, thanh và số. Thanh dày 8px, bo tròn đầu; dòng có `href` là link mở danh sách lọc đúng
// nhóm đó. Thanh dài theo giá trị lớn nhất trong danh sách, không theo tổng
export function BarList({
  items,
  formatValue = formatCount,
  ariaLabel,
}: {
  items: BarListItem[]
  formatValue?: (n: number) => string
  ariaLabel: string
}) {
  const max = Math.max(0, ...items.map((i) => i.value))
  return (
    <ul aria-label={ariaLabel} className="space-y-2.5">
      {items.map((item) => {
        const width = max > 0 ? Math.max(item.value > 0 ? 2 : 0, (item.value / max) * 100) : 0
        const body = (
          <>
            <span className="flex items-baseline gap-2 text-body">
              <span className="min-w-0 flex-1 truncate text-fg-2">{item.label}</span>
              <span className="tnum shrink-0 font-semibold text-fg">{formatValue(item.value)}</span>
              {item.note != null && <span className="tnum shrink-0 text-meta text-fg-3">{item.note}</span>}
            </span>
            <span aria-hidden className="mt-1 block h-2 w-full rounded-control bg-surface-2">
              <span className="block h-2 rounded-control" style={{ width: `${width}%`, backgroundColor: item.color }} />
            </span>
          </>
        )
        return (
          <li key={item.key}>
            {item.href ? (
              <Link to={item.href} className={cx('-mx-2 block rounded-control px-2 py-1 hover:bg-hover')}>
                {body}
              </Link>
            ) : (
              <div className="py-1">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
