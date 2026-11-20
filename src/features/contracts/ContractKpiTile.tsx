import type { ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import type { Tone } from '@/components/common/ui/badge'
import { cx } from '@/utils/cx'

// Ô số liệu đầu trang danh sách hợp đồng (nhân viên và khách): nhãn IN HOA, số lớn kèm đơn vị, ghi chú màu, ô icon bên phải.
// Kiểu ở contract-detail.css (.ct-card, .ct-kpi), chỉ đúng trong trang bọc `.ct-page`

const noteTones: Partial<Record<Tone, string>> = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  info: 'text-info',
  accent: 'text-accent-fg',
}

const valueTones: Partial<Record<Tone, string>> = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
}

export function ContractKpiTile({
  label,
  value,
  unit,
  note,
  icon,
  tone = 'neutral',
  valueTone,
  noteTone,
}: {
  label: string
  value: ReactNode
  unit?: ReactNode
  note?: ReactNode
  icon: string
  tone?: Tone
  /** Màu của số; mặc định chữ chính */
  valueTone?: Tone
  /** Màu của ghi chú; mặc định theo `tone` */
  noteTone?: Tone
}) {
  return (
    <div className="ct-card ct-kpi">
      <div className="min-w-0">
        <p className="ct-eyebrow text-fg-2">{label}</p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className={cx('tnum text-display font-bold', (valueTone && valueTones[valueTone]) ?? 'text-fg')}>
            {value}
          </span>
          {unit && <span className="text-body text-fg-2">{unit}</span>}
        </p>
        {note && <p className={cx('mt-1 text-meta', noteTones[noteTone ?? tone] ?? 'text-fg-2')}>{note}</p>}
      </div>
      <span className="ct-kpi-icon" data-tone={tone} aria-hidden>
        <Icon name={icon} className="text-[24px]" />
      </span>
    </div>
  )
}
