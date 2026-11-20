import type { ReactNode } from 'react'

export type TooltipRow = { key: string; color: string; label: ReactNode; value: ReactNode }

// Hộp tooltip chung của biểu đồ: tiêu đề (tháng, ngày, nhóm), mỗi dòng một chuỗi, dòng tổng nếu có
export function ChartTooltipBox({ title, rows, total }: { title?: ReactNode; rows: TooltipRow[]; total?: ReactNode }) {
  return (
    <div className="min-w-44 rounded-control border border-line bg-panel px-3 py-2 text-meta shadow-pop">
      {title && <p className="mb-1 font-semibold text-fg">{title}</p>}
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-baseline gap-2">
            <span aria-hidden className="size-2 shrink-0 self-center rounded-[2px]" style={{ backgroundColor: r.color }} />
            <span className="text-fg-2">{r.label}</span>
            <span className="tnum ml-auto pl-3 font-semibold text-fg">{r.value}</span>
          </li>
        ))}
      </ul>
      {total && (
        <p className="mt-1 flex items-baseline justify-between gap-3 border-t border-line pt-1 text-fg-2">
          <span>Tổng</span>
          <span className="tnum font-semibold text-fg">{total}</span>
        </p>
      )}
    </div>
  )
}
