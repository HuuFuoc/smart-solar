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

/* Actions sit under the record, one step closer than the gap between records. */
export function ListRowActions({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('mt-4 flex flex-wrap items-center gap-3', className)}>{children}</div>
}
