import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'

// Dải số liệu dùng subgrid để nhãn dài không làm lệch số. 2 cột trên điện thoại, 4 cột từ md
// `framed`: gom các số vào một khung, mỗi số một ô
export function StatRow({
  children,
  className,
  framed = false,
}: {
  children: ReactNode
  className?: string
  framed?: boolean
}) {
  return (
    <dl
      className={cx(
        'grid grid-cols-2 content-start md:grid-cols-4',
        framed
          ? 'gap-px overflow-hidden rounded-container border border-line bg-line *:bg-canvas *:px-4 *:py-3'
          : 'gap-x-8 gap-y-6',
        className,
      )}
    >
      {children}
    </dl>
  )
}

/* A figure with its label. Numbers only; a text value belongs in a KeyValueList. */
export function Stat({
  label,
  value,
  unit,
  note,
  tone,
  size = 'md',
  className,
}: {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  note?: ReactNode
  tone?: 'default' | 'warn' | 'danger' | 'ok'
  size?: 'md' | 'lg'
  className?: string
}) {
  const valueTone = tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-fg'
  return (
    <div className={cx('row-span-3 grid min-w-0 grid-rows-subgrid gap-y-1', className)}>
      <dt className="text-meta text-fg-2">{label}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-2">
        <span className={cx('tnum font-semibold', size === 'lg' ? 'text-display' : 'text-figure', valueTone)}>
          {value}
        </span>
        {unit && <span className="text-body text-fg-3">{unit}</span>}
      </dd>
      <dd className="text-meta text-fg-3">{note}</dd>
    </div>
  )
}
