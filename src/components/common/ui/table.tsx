import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cx } from '@/utils/cx'

// Bảng rộng theo khung chứa, tràn thì cuộn ngang. Cột phụ ẩn bằng `hidden md:table-cell`
// `stack`: dưới lg mỗi dòng thành khối nhãn / giá trị (lấy từ `label` của ô). `stack="xl"` thì xếp khối tới 1280px
// Ô đầu / cuối có lề 12px và bảng lấn ra 12px mỗi bên, để chữ vẫn thẳng mép trang
export function Table({ stack, className, ...rest }: HTMLAttributes<HTMLTableElement> & { stack?: boolean | 'xl' }) {
  return (
    <div
      className={cx(
        'scroll-x relative -mx-4 px-4 [scrollbar-width:thin] md:mx-0 md:px-0',
        stack === 'xl' ? 'xl:-mx-3' : 'lg:-mx-3',
      )}
    >
      <table
        className={cx(
          'w-full border-collapse text-body',
          stack === 'xl' ? 'table-stack-xl' : stack && 'table-stack',
          className,
        )}
        {...rest}
      />
    </div>
  )
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cx(
        'border-b border-line-2 px-3 pb-2 text-left align-bottom text-meta font-semibold whitespace-nowrap text-fg-2 first:pl-0 last:pr-0 lg:first:pl-3 lg:last:pr-3',
        className,
      )}
      {...rest}
    />
  )
}

export function Td({ label, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { label?: string }) {
  return (
    <td
      data-label={label}
      className={cx(
        'border-b border-line px-3 py-3 align-top first:pl-0 last:pr-0 lg:first:pl-3 lg:last:pr-3',
        className,
      )}
      {...rest}
    />
  )
}

export function Tr({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cx('lg:hover:bg-hover', className)} {...rest} />
}
