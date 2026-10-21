import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'

// Một dòng trong danh sách, ngăn cách bằng đường kẻ. `tone` vẽ vạch màu ở lề trái
export function ListRow({
  tone,
  selected,
  className,
  children,
}: {
  tone?: 'danger' | 'warn' | 'accent'
  selected?: boolean
  className?: string
  children: ReactNode
}) {
  const rule =
    tone === 'danger'
      ? 'border-l-danger'
      : tone === 'warn'
        ? 'border-l-warn'
        : tone === 'accent'
          ? 'border-l-accent'
          : undefined
  return (
    <li
      aria-current={selected ? 'true' : undefined}
      className={cx(
        'py-4',
        tone && cx('border-l-2 pl-4', rule),
        selected && '-mx-4 rounded-container bg-surface-2 px-4',
        className,
      )}
    >
      {children}
    </li>
  )
}

// Danh sách dạng cột: từ lg mỗi dòng trải ngang thành các ô thẳng hàng với dòng tiêu đề cột,
// màn hẹp thì ô xếp lưới 2 cột và hiện nhãn ngay trong ô.
// `columns` là lớp lg:grid-cols-[...] dùng chung cho tiêu đề và mọi dòng để các cột thẳng nhau
export function ListHead({ columns, labels }: { columns: string; labels: string[] }) {
  return (
    <div aria-hidden className={cx('hidden gap-x-6 border-b border-line pb-2 text-meta text-fg-2 lg:grid', columns)}>
      {labels.map((label, i) => (
        <span key={i}>{label}</span>
      ))}
    </div>
  )
}

export function ListCells({ columns, children }: { columns: string; children: ReactNode }) {
  return <div className={cx('grid grid-cols-2 gap-x-6 gap-y-3 lg:items-center', columns)}>{children}</div>
}

/** Một ô. Từ lg nhãn chỉ còn cho trình đọc màn hình vì đã có dòng tiêu đề; `wide` chiếm cả dòng ở màn hẹp */
export function ListCell({
  label,
  wide,
  className,
  children,
}: {
  label?: string
  wide?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx('min-w-0 text-body text-fg', wide && 'col-span-2 lg:col-span-1', className)}>
      {label && <span className="block text-meta text-fg-2 lg:sr-only">{label}</span>}
      {children}
    </div>
  )
}

/* Actions sit under the record, one step closer than the gap between records. */
export function ListRowActions({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('mt-4 flex flex-wrap items-center gap-3', className)}>{children}</div>
}
