import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'

/** Một mục: nhãn (k) và giá trị (v) */
export type Fact = { k: string; v: ReactNode }

// Danh sách nhãn / giá trị, nhãn nằm trên giá trị để dùng được cả trong cột hẹp.
// Mặc định xếp ngang và tự xuống dòng, `column` thì mỗi mục một dòng.
export function Facts({ items, column, className }: { items: Fact[]; column?: boolean; className?: string }) {
  return (
    <dl className={cx(column ? 'grid gap-y-4' : 'flex flex-wrap gap-x-8 gap-y-3', className)}>
      {items.map((item) => (
        <div key={item.k} className="min-w-0">
          <dt className="text-meta text-fg-2">{item.k}</dt>
          <dd className="tnum text-body text-fg wrap-break-word">{item.v}</dd>
        </div>
      ))}
    </dl>
  )
}
