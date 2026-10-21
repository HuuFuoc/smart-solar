import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'

// Thanh lọc chung cho các trang danh sách: ô tìm và select, bên dưới là tab
export function FilterBar({
  children,
  tabs,
  className,
}: {
  children?: ReactNode
  tabs?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('mb-6 space-y-4', className)}>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      {tabs}
    </div>
  )
}
