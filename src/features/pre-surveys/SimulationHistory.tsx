import { useEffect, useRef } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { formatRelative } from '@/features/pre-surveys/preSurveyDisplay'
import { formatKwh, formatOne, mountingLabel } from '@/features/pre-surveys/simulationDisplay'
import type { SimulationListItem } from '@/types/res/simulationsRes'
import { cx } from '@/utils/cx'
import { keepInView } from '@/utils/scroll'

// Danh sách các lần chạy mô phỏng, mới nhất trước. Cuộn trong khung khoảng 3,5 dòng
export function SimulationHistory({
  items,
  viewingId,
  onView,
}: {
  items: SimulationListItem[]
  viewingId: string | null
  onView: (simulationId: string) => void
}) {
  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const list = listRef.current
    const current = list?.querySelector<HTMLElement>('[aria-current="true"]')
    if (list && current) keepInView(list, current)
  }, [viewingId, items.length])

  return (
    <ol ref={listRef} className="-mx-2 max-h-72 space-y-1 overflow-y-auto overscroll-contain scrollbar-thin">
      {items.map((s) => {
        const viewing = s.simulationId === viewingId
        return (
          <li key={s.simulationId}>
            <button
              type="button"
              aria-current={viewing ? 'true' : undefined}
              onClick={() => onView(s.simulationId)}
              className={cx(
                'press w-full rounded-control px-2 py-2 text-left',
                viewing ? 'bg-accent-soft' : 'hover:bg-hover',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              )}
            >
              <span className={cx('block text-body', viewing ? 'font-semibold text-accent-fg' : 'font-medium text-fg')}>
                {mountingLabel(s.mountingType)}, {s.productName}
              </span>
              <span className="tnum block text-meta text-fg-2">
                {s.panelCount} tấm, {formatOne(s.installedCapacityKwp)} kWp
                {s.annualEnergyKwh != null ? `, ${formatKwh(s.annualEnergyKwh)} kWh/năm` : ', chưa có sản lượng'}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-meta text-fg-3">{formatRelative(s.createdAt)}</span>
                {s.isSelected && <Badge tone="accent">Mô phỏng chính</Badge>}
                {s.isStale && <Badge tone="warn">Theo mặt lắp cũ</Badge>}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
