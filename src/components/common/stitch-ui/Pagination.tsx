import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

/* Theo thanh phân trang của user_management / product_catalogue. */
export type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  pageSizeOptions?: number[]
  onPageSizeChange?: (pageSize: number) => void
  /** Danh từ sau "of N", ví dụ "users", "entries" */
  itemLabel?: string
  /** Số hàng thực tế đang hiển thị, khi ít hơn pageSize (mock chỉ có vài hàng mẫu) */
  visibleCount?: number
  className?: string
}

type PageItem = number | 'gap'

/** 1 2 3 ... N, mở rộng quanh trang hiện tại */
function pageItems(page: number, count: number): PageItem[] {
  if (count <= 6) return Array.from({ length: count }, (_, i) => i + 1)
  const items: PageItem[] = [1, 2, 3]
  if (page > 4) items.push('gap')
  const start = Math.max(4, page - 1)
  const end = Math.min(count - 1, page + 1)
  for (let p = start; p <= end; p += 1) items.push(p)
  if (end < count - 1) items.push('gap')
  items.push(count)
  return items
}

const pageButtonBase = 'flex h-8 w-8 items-center justify-center rounded-lg text-label-sm transition-colors'

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  itemLabel = 'mục',
  visibleCount,
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = visibleCount !== undefined ? Math.min(from + visibleCount - 1, total) : Math.min(page * pageSize, total)

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-space-md bg-surface-container-low p-space-md sm:flex-row',
        className,
      )}
    >
      <div className="flex items-center gap-space-md">
        <span className="text-body-sm text-on-surface-variant">
          Hiển thị{' '}
          <strong className="font-semibold text-on-surface">
            {from}–{to}
          </strong>{' '}
          trên <strong className="font-semibold text-on-surface">{total.toLocaleString()}</strong> {itemLabel}
        </span>
        {pageSizeOptions && onPageSizeChange && (
          <label className="flex items-center gap-2">
            <span className="text-body-sm text-outline">Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 cursor-pointer rounded-lg border-0 bg-surface-container-lowest px-2 text-label-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} dòng
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <nav aria-label="Phân trang" className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            pageButtonBase,
            'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40',
          )}
        >
          <Icon name="chevron_left" className="text-[16px]" />
        </button>
        {pageItems(page, pageCount).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-body-sm text-outline">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                pageButtonBase,
                item === page
                  ? 'bg-primary font-semibold text-on-primary shadow-sm'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high',
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Trang sau"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            pageButtonBase,
            'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40',
          )}
        >
          <Icon name="chevron_right" className="text-[16px]" />
        </button>
      </nav>
    </div>
  )
}
