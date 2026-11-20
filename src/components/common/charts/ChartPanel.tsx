import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/common/ui/button'
import { Skeleton } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cx } from '@/utils/cx'

export type ChartTable = {
  caption: string
  columns: { label: string; numeric?: boolean }[]
  rows: { key: string; cells: ReactNode[] }[]
}

export type ChartState = 'loading' | 'error' | 'empty' | 'ready'

/** Phạm vi của số liệu: "Hiện tại" (trạng thái lúc tải) khác "Trong kỳ" (theo khoảng ngày đã chọn) */
export function ScopeTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-control bg-surface-2 px-1.5 text-meta font-medium whitespace-nowrap text-fg-2">
      {children}
    </span>
  )
}

// Khung của một biểu đồ: tiêu đề, đơn vị / phạm vi, trạng thái tải / lỗi / rỗng, và bảng số liệu thay cho biểu đồ
// (bấm "Bảng số liệu" để đọc bằng trình đọc màn hình hoặc khi không phân biệt được màu)
export function ChartPanel({
  title,
  description,
  scope,
  state = 'ready',
  emptyText = 'Chưa có dữ liệu trong phạm vi này.',
  errorText = 'Không tải được số liệu.',
  onRetry,
  table,
  action,
  footer,
  className,
  bodyClassName,
  children,
}: {
  title: string
  description?: ReactNode
  scope?: ReactNode
  state?: ChartState
  emptyText?: string
  errorText?: string
  onRetry?: () => void
  table?: ChartTable
  action?: ReactNode
  footer?: ReactNode
  className?: string
  bodyClassName?: string
  children?: ReactNode
}) {
  const [asTable, setAsTable] = useState(false)
  const titleId = useId()
  const showTable = asTable && state === 'ready' && table
  return (
    <section
      aria-labelledby={titleId}
      className={cx('chart-frame flex min-w-0 flex-col rounded-container border border-line bg-panel p-4', className)}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={titleId} className="text-title font-semibold">
              {title}
            </h2>
            {scope && <ScopeTag>{scope}</ScopeTag>}
          </div>
          {description && <p className="mt-1 text-meta text-fg-2">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {table && state === 'ready' && (
            <Button
              variant="ghost"
              size="sm"
              bleed={false}
              icon={asTable ? 'bar_chart' : 'table_rows'}
              aria-pressed={asTable}
              onClick={() => setAsTable((v) => !v)}
            >
              {asTable ? 'Biểu đồ' : 'Bảng số liệu'}
            </Button>
          )}
        </div>
      </header>
      <div className={cx('min-w-0 flex-1', bodyClassName)}>
        {state === 'loading' ? (
          <div aria-busy="true" aria-label="Đang tải" className="space-y-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : state === 'error' ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-control bg-danger-soft px-3 py-2">
            <Icon name="error" className="text-[20px] text-danger" />
            <p className="text-body text-fg">{errorText}</p>
            {onRetry && (
              <Button variant="secondary" size="sm" icon="refresh" onClick={onRetry}>
                Thử lại
              </Button>
            )}
          </div>
        ) : state === 'empty' ? (
          <p className="rounded-control border border-dashed border-line-2 px-4 py-8 text-center text-body text-fg-2">
            {emptyText}
          </p>
        ) : showTable ? (
          <Table aria-label={table.caption}>
            <thead>
              <tr>
                {table.columns.map((c) => (
                  <Th key={c.label} className={c.numeric ? 'text-right' : undefined}>
                    {c.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r) => (
                <Tr key={r.key}>
                  {r.cells.map((cell, i) => (
                    <Td key={i} className={table.columns[i]?.numeric ? 'tnum text-right' : undefined}>
                      {cell}
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          children
        )}
      </div>
      {footer && state === 'ready' && <div className="mt-3 text-meta text-fg-3">{footer}</div>}
    </section>
  )
}

/** Dòng chú giải: ô màu (nhận diện) + tên + số. Chữ luôn dùng màu chữ, không dùng màu của chuỗi */
export function LegendItem({
  color,
  label,
  value,
  note,
  shape = 'square',
}: {
  color: string
  label: ReactNode
  value?: ReactNode
  note?: ReactNode
  shape?: 'square' | 'line'
}) {
  return (
    <li className="flex min-w-0 items-baseline gap-2 text-body">
      <span
        aria-hidden
        className={cx('shrink-0 self-center', shape === 'line' ? 'h-0.5 w-3 rounded-full' : 'size-2.5 rounded-[3px]')}
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 text-fg-2">{label}</span>
      {value != null && <span className="tnum ml-auto shrink-0 font-semibold text-fg">{value}</span>}
      {note != null && <span className="tnum shrink-0 text-meta text-fg-3">{note}</span>}
    </li>
  )
}
