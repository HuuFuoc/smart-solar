import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'

// Thanh thao tác dính đáy, lấn ra mép bằng đúng padding của main để đường kẻ thẳng hàng với trang
export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'sticky bottom-0 z-10 -mx-4 mt-6 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}
