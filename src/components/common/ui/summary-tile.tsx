import { Icon } from '@/components/common/stitch-ui/Icon'

// Ô tổng quan đầu trang danh sách: nhãn, icon màu bên phải, số lớn kèm ghi chú. Có `onClick` thì là nút lọc,
// `active` viền xanh đậm. Kiểu ở survey-detail.css (.sv-dtile), chỉ có hiệu lực trong trang bọc `.sv-list`
export function SummaryTile({
  label,
  count,
  note,
  icon,
  tone,
  active,
  upper,
  onClick,
}: {
  label: string
  count: number
  note: string
  icon: string
  tone: 'warn' | 'info' | 'danger' | 'ok' | 'neutral'
  active?: boolean
  /** Nhãn IN HOA giãn chữ */
  upper?: boolean
  onClick?: () => void
}) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className={upper ? 'sv-label text-meta font-medium' : 'text-body text-fg-2'}>{label}</span>
        <span className="sv-stat-icon size-9!" data-tone={tone} aria-hidden>
          <Icon name={icon} className="text-[20px]" />
        </span>
      </span>
      <span className="mt-3 flex items-baseline gap-2">
        <span className="tnum text-display font-bold text-fg">{count}</span>
        <span className="text-meta text-fg-2">{note}</span>
      </span>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className="sv-dtile press" data-active={active}>
      {body}
    </button>
  ) : (
    <div className="sv-dtile" data-active={false}>
      {body}
    </div>
  )
}
