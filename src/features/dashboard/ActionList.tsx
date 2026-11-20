import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Count } from '@/components/common/ui/badge'
import { Skeleton } from '@/components/common/ui/states'
import { cx } from '@/utils/cx'

export type ActionSubItem = { key: string; label: ReactNode; meta?: ReactNode; href: string }

export type ActionItem = {
  key: string
  label: string
  /** Giải thích ngắn: ai đang chờ, vì sao gấp */
  hint?: string
  count: number
  href: string
  /** Đỏ khi là việc của người xem phải làm ngay */
  urgent?: boolean
  /** Vài dòng đầu của danh sách (mỗi dòng mở đúng trang chi tiết) */
  items?: ActionSubItem[]
}

// Danh sách việc ưu tiên của trang Tổng quan: mỗi dòng một loại việc lấy từ backend, số đếm và link tới đúng danh sách / chi tiết.
// Loại việc bằng 0 thì ẩn; hết việc thì báo một dòng
export function ActionList({
  title = 'Việc cần xử lý',
  actions,
  loading,
  emptyText = 'Không có việc nào đang chờ.',
  className,
}: {
  title?: string
  actions: ActionItem[]
  loading?: boolean
  emptyText?: string
  className?: string
}) {
  const shown = actions.filter((a) => a.count > 0)
  return (
    <section aria-label={title} className={cx('rounded-container border border-line bg-panel p-4', className)}>
      <h2 className="mb-3 flex items-center gap-2 text-title font-semibold">
        {title}
        {!loading && shown.length > 0 && (
          <Count value={shown.reduce((s, a) => s + a.count, 0)} attention={shown.some((a) => a.urgent)} />
        )}
      </h2>
      {loading ? (
        <div aria-busy="true" aria-label="Đang tải" className="space-y-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : shown.length === 0 ? (
        <p className="text-body text-fg-2">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((a) => (
            <li key={a.key} className="py-2.5 first:pt-0 last:pb-0">
              <Link to={a.href} className="group -mx-2 flex items-start gap-3 rounded-control px-2 py-1 hover:bg-hover">
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-medium text-fg group-hover:underline">{a.label}</span>
                  {a.hint && <span className="block text-meta text-fg-2">{a.hint}</span>}
                </span>
                <Count value={a.count} attention={a.urgent} className="mt-0.5" />
              </Link>
              {a.items && a.items.length > 0 && (
                <ul className="mt-1 space-y-0.5 border-l border-line pl-3">
                  {a.items.map((s) => (
                    <li key={s.key}>
                      <Link
                        to={s.href}
                        className="-mx-2 flex items-baseline gap-2 rounded-control px-2 py-1 text-meta hover:bg-hover"
                      >
                        <span className="min-w-0 flex-1 truncate text-fg">{s.label}</span>
                        {s.meta && <span className="tnum shrink-0 text-fg-3">{s.meta}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
