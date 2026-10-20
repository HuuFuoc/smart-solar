import type { HTMLAttributes } from 'react'
import { cx } from '@/utils/cx'

// Link tới trang chưa có trong bản này: trông như link nhưng bấm không làm gì
export function PlaceholderLink({ className, children, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="link"
      aria-disabled="true"
      tabIndex={0}
      title="Chưa có trong bản này"
      className={cx('cursor-pointer', className)}
      {...rest}
    >
      {children}
    </span>
  )
}
