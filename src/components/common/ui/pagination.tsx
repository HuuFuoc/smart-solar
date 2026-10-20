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
                ? 'inline-flex bg-accent-soft font-semibold text-accent-fg'
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
