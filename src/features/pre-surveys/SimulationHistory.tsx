import { useEffect, useRef } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { formatRelative } from '@/features/pre-surveys/components/preSurveyDisplay'
import { formatKwh, formatOne, mountingLabel } from '@/features/pre-surveys/components/simulationDisplay'
import type { SimulationListItem } from '@/types/res/simulationsRes'
import { cx } from '@/utils/cx'
import { keepInView } from '@/utils/scroll'

/*
  Các lần chạy mô phỏng của một bản đánh giá, mới nhất trước (GET .../simulations). Cả dòng là nút "xem lần này";
  dòng đang xem có nền "đang chọn". Nhãn: "Mô phỏng chính" là lần backend chọn (lần tạo / dùng lại gần nhất; không có
  API chọn lại lần khác), "Theo mặt lắp cũ" là lần tính trước khi mặt lắp đổi. Đủ hẹp để nằm trong cột phụ.
  Chạy nhiều lần thì danh sách cuộn trong khung cao khoảng ba dòng rưỡi (dòng thứ tư lộ một nửa cho biết còn nữa) thay vì
  kéo dài cả trang (người dùng 10/10/2026); lần đang xem luôn được cuộn tới. Vòng focus vẽ vào trong nút để khung cuộn không cắt.
*/
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
