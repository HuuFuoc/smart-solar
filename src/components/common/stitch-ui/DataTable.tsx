import type { ReactNode } from 'react'
import { Card } from '@/components/common/stitch-ui/Card'
import { Checkbox } from '@/components/common/stitch-ui/Checkbox'
import { Pagination, type PaginationProps } from '@/components/common/stitch-ui/Pagination'
import { cn } from '@/utils/cn'

// Bảng dữ liệu: chọn hàng, cột thao tác, phân trang
export type DataTableColumn<T> = {
  key: string
  header: ReactNode
  align?: 'left' | 'center' | 'right'
  /** Class cho ô <td> */
  className?: string
  /** Class cho ô <th> */
  headerClassName?: string
  render: (row: T) => ReactNode
}

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  selectable?: boolean
  selectedKeys?: ReadonlySet<string>
  onSelectionChange?: (keys: Set<string>) => void
  /** Cột action bên phải (IconButton...) */
  actions?: (row: T) => ReactNode
  actionsHeader?: ReactNode
  /** Thanh tiêu đề trên bảng: tên + chip đếm + nút export... */
  toolbar?: ReactNode
  /** Nội dung dưới bảng khi không dùng pagination (dòng "Showing..." + link) */
  footer?: ReactNode
  pagination?: PaginationProps
  emptyMessage?: ReactNode
  /** card = bọc trong Card trắng (mặc định); plain = chỉ bảng, để đặt trong card có sẵn */
  variant?: 'card' | 'plain'
  /** md: bảng chính, sm: bảng gọn, compact: danh mục sản phẩm, matrix: ô cao, nội dung căn trên */
  size?: 'md' | 'sm' | 'compact' | 'matrix'
  /** Kẻ đường ngăn giữa các hàng (my_tasks_1) */
  divided?: boolean
  /** Hàng thấp hơn (py-space-sm) như product_catalogue, chỉ áp dụng cho size md */
  dense?: boolean
  onRowClick?: (row: T) => void
  className?: string
}

const alignClasses = { left: 'text-left', center: 'text-center', right: 'text-right' } as const

const sizeStyles = {
  md: {
    thead: 'bg-surface-container-low text-label-md text-on-surface-variant',
    th: 'px-3 py-3.5 font-semibold',
    thEdge: { first: 'pl-space-md', last: 'pr-space-md' },
    td: 'px-3',
    tdEdge: { first: 'pl-space-md', last: 'pr-space-md' },
    tbody: 'text-body-md text-on-surface',
    rowHover: 'hover:bg-surface-container-low/50',
  },
  sm: {
    thead: 'bg-surface-container-low/60 text-label-sm text-outline',
    th: 'px-space-sm py-space-xs font-semibold first:rounded-l-lg last:rounded-r-lg',
    thEdge: { first: '', last: '' },
    td: 'px-space-sm',
    tdEdge: { first: '', last: '' },
    tbody: 'text-body-sm text-on-surface',
    rowHover: 'hover:bg-surface-container-low/40',
  },
  /** Header in hoa, ô cao, nội dung căn trên */
  matrix: {
    thead: 'bg-surface-container-low text-label-sm text-on-surface-variant',
    th: 'px-space-md py-space-md font-semibold',
    thEdge: { first: 'pl-space-lg', last: 'pr-space-lg' },
    td: 'px-space-md align-top',
    tdEdge: { first: 'pl-space-lg', last: 'pr-space-lg' },
    tbody: 'text-body-md text-on-surface',
    rowHover: 'hover:bg-surface-container-low/60',
  },
  /** product_catalogue: header label-sm text-outline, hàng py-space-sm, hover rất nhạt */
  compact: {
    thead: 'bg-surface-container-low/70 text-label-sm text-outline',
    // Không bẻ tiêu đề cột: bảng đã cuộn ngang trong khung khi hẹp.
    th: 'whitespace-nowrap px-space-md py-3 font-semibold',
    thEdge: { first: '', last: '' },
    td: 'px-space-md',
    tdEdge: { first: '', last: '' },
    tbody: 'text-body-sm text-on-surface',
    rowHover: 'hover:bg-surface-container-low/20',
  },
} as const

const EMPTY_SELECTION: ReadonlySet<string> = new Set()

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  actions,
  actionsHeader = 'Thao tác',
  toolbar,
  footer,
  pagination,
  emptyMessage = 'Không có bản ghi nào',
  variant = 'card',
  size = 'md',
  divided = false,
  dense = false,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const s = sizeStyles[size]
  const selected = selectedKeys ?? EMPTY_SELECTION
  const allKeys = rows.map(rowKey)
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.has(key))
  const someSelected = !allSelected && allKeys.some((key) => selected.has(key))

  const toggleAll = () => {
    if (!onSelectionChange) return
    onSelectionChange(allSelected ? new Set() : new Set(allKeys))
  }
  const toggleOne = (key: string) => {
    if (!onSelectionChange) return
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onSelectionChange(next)
  }

  const cellPadding =
    size === 'sm' ? 'py-3' : size === 'matrix' ? 'py-space-lg' : size === 'compact' || dense ? 'py-space-sm' : 'py-4'
  const columnCount = columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)
  const lastIndex = columns.length - 1

  const table = (
    <>
      {toolbar &&
        (variant === 'card' ? (
          // Lề 16px, thẳng mép với ô đầu của bảng (px-space-md).
          <div className="flex items-center justify-between bg-surface-container-low/40 px-space-md py-space-md">
            {toolbar}
          </div>
        ) : (
          <div className="mb-space-lg flex items-center justify-between gap-space-sm">{toolbar}</div>
        ))}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className={cn('select-none', s.thead)}>
              {selectable && (
                <th className={cn('w-10 py-3.5 pr-2', s.thEdge.first)}>
                  <Checkbox
                    size="sm"
                    checked={someSelected ? 'indeterminate' : allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Chọn tất cả dòng"
                  />
                </th>
              )}
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className={cn(
                    s.th,
                    index === 0 && !selectable && s.thEdge.first,
                    index === lastIndex && !actions && s.thEdge.last,
                    alignClasses[column.align ?? 'left'],
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
              {actions && <th className={cn(s.th, 'text-right', s.thEdge.last)}>{actionsHeader}</th>}
            </tr>
          </thead>

          <tbody className={cn(s.tbody, divided && 'divide-y divide-surface-container')}>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="py-space-xl text-center text-body-sm text-on-surface-variant">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const key = rowKey(row)
              const isSelected = selected.has(key)
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'group transition-colors',
                    isSelected ? 'bg-surface-container-low/40 hover:bg-surface-container-high/40' : s.rowHover,
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {selectable && (
                    <td className={cn(cellPadding, 'pr-2', s.tdEdge.first)} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="sm"
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(key)}
                        aria-label={`Chọn dòng ${key}`}
                      />
                    </td>
                  )}
                  {columns.map((column, index) => (
                    <td
                      key={column.key}
                      className={cn(
                        cellPadding,
                        s.td,
                        index === 0 && !selectable && s.tdEdge.first,
                        index === lastIndex && !actions && s.tdEdge.last,
                        alignClasses[column.align ?? 'left'],
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                  {actions && (
                    <td
                      className={cn(cellPadding, s.td, 'text-right', s.tdEdge.last)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">{actions(row)}</div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {footer}
      {pagination && <Pagination {...pagination} />}
    </>
  )

  if (variant === 'plain') {
    return <div className={cn('flex flex-col', className)}>{table}</div>
  }
  return (
    <Card padding="none" className={cn('flex flex-col overflow-hidden', className)}>
      {table}
    </Card>
  )
}
