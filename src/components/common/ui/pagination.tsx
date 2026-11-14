import { useState, type ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cx } from '@/utils/cx'

// Trang hiện tại tô nền nhạt màu chính, không dùng nền đặc
export function Pagination({
  page,
  pages,
  onChange,
  className,
}: {
  page: number
  pages: number
  onChange?: (page: number) => void
  className?: string
}) {
  const shown = pages <= 5 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, 2, 3, null, pages]
  const item = 'press h-11 min-w-11 items-center justify-center rounded-control px-2 text-body lg:h-8 lg:min-w-8'
  const step = cx(
    item,
    'inline-flex gap-1 text-fg-2 not-disabled:hover:bg-hover not-disabled:hover:text-fg disabled:text-fg-3',
  )
  return (
    <nav aria-label="Phân trang" className={cx('flex items-center gap-1', className)}>
      <button type="button" className={cx(step, 'pr-3 pl-1')} disabled={page <= 1} onClick={() => onChange?.(page - 1)}>
        <Icon name="chevron_left" className="text-[20px]" />
        Trước
      </button>
      {shown.map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="hidden px-1 text-fg-3 md:inline" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange?.(p)}
            className={cx(
              'tnum',
              item,
              p === page
                ? 'inline-flex bg-primary font-semibold text-primary-fg'
                : 'hidden text-fg-2 hover:bg-hover hover:text-fg md:inline-flex',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={cx(step, 'pr-1 pl-3')}
        disabled={page >= pages}
        onClick={() => onChange?.(page + 1)}
      >
        Sau
        <Icon name="chevron_right" className="text-[20px]" />
      </button>
    </nav>
  )
}

/** Dòng "Hiển thị 1–10 trên 12 …" và thanh trang dưới danh sách. Luôn hiện, kể cả khi chỉ có một trang */
export function ListPager({
  page,
  pages,
  from,
  to,
  total,
  noun,
  onChange,
  keepScroll = false,
  className,
}: {
  page: number
  pages: number
  from: number
  to: number
  total: number
  noun: string
  onChange: (page: number) => void
  /** Danh sách chỉ là một khối trong trang: đổi trang không cuộn về đầu trang */
  keepScroll?: boolean
  className?: string
}) {
  return (
    <div
      className={cx('mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line/60', className)}
    >
      <div className="flex items-center gap-1.5 text-meta text-fg-2">
        <Icon name="history" className="text-primary text-[20px]" />
        <span className="tnum">
          Hiển thị {from}–{to} trên {total} {noun}
        </span>
      </div>
      <Pagination
        page={page}
        pages={Math.max(1, pages)}
        onChange={(next) => {
          onChange(next)
          if (!keepScroll) window.scrollTo({ top: 0 })
        }}
      />
    </div>
  )
}

/** Chia danh sách đã tải hết (API không phân trang) thành trang 10 dòng, kèm ListPager */
export function PagedList<T>({
  items,
  noun,
  pageSize = 10,
  keepScroll,
  children,
}: {
  items: T[]
  noun: string
  pageSize?: number
  keepScroll?: boolean
  children: (pageItems: T[]) => ReactNode
}) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  // Danh sách ngắn lại (vd. vừa huỷ một yêu cầu) thì về trang cuối còn dòng
  const current = Math.min(page, pages)
  const start = (current - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)
  return (
    <>
      {children(pageItems)}
      <ListPager
        page={current}
        pages={pages}
        from={pageItems.length > 0 ? start + 1 : 0}
        to={start + pageItems.length}
        total={items.length}
        noun={noun}
        onChange={setPage}
        keepScroll={keepScroll}
      />
    </>
  )
}
