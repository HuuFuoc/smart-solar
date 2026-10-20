import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'

/*
  Nhãn nằm trên giá trị, không chia cột nhãn/giá trị như KeyValueList: dùng được cả trong khối hẹp
  (cột phụ ~230px) mà không bẻ chữ. `column` xếp mỗi mục một dòng; mặc định xếp ngang, tự xuống dòng.
*/
export function Facts({ items, column, className }: { items: { k: string; v: ReactNode }[]; column?: boolean; className?: string }) {
  return (
    <dl className={cx(column ? 'grid gap-y-4' : 'flex flex-wrap gap-x-8 gap-y-3', className)}>
      {items.map((item) => (
        <div key={item.k} className="min-w-0">
          <dt className="text-meta text-fg-3">{item.k}</dt>
          <dd className="tnum text-body text-fg wrap-break-word">{item.v}</dd>
        </div>
      ))}
    </dl>
  )
}
