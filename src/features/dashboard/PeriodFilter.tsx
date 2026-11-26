import { DateField, Select } from '@/components/common/ui/field'
import { Segmented } from '@/components/common/ui/segmented'
import { presetOf, presetRange, type PeriodPreset } from '@/features/dashboard/dashboardStats'

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: '3 tháng' },
  { value: 'half', label: '6 tháng' },
  { value: 'year', label: 'Năm nay' },
]

// Bộ lọc kỳ (nút nhanh hoặc hai ngày) và khu vực của trang Tổng quan. Giá trị nằm trên địa chỉ trang ở nơi gọi
export function PeriodFilter({
  from,
  to,
  today,
  onChange,
  error,
  zones,
  zoneId,
  onZoneChange,
  zoneNote,
}: {
  from: string
  to: string
  today: string
  onChange: (range: { from: string; to: string }) => void
  error?: string | null
  zones?: { zoneId: string; name: string }[]
  zoneId?: string
  onZoneChange?: (zoneId: string) => void
  zoneNote?: string
}) {
  const preset = presetOf(from, to, today)
  return (
    <fieldset className="flex flex-col gap-2 rounded-container border border-line bg-panel p-3">
      <legend className="sr-only">Kỳ xem và khu vực</legend>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<PeriodPreset>
          label="Kỳ xem nhanh"
          size="sm"
          className="w-full sm:w-auto"
          value={preset === 'custom' ? ('' as PeriodPreset) : preset}
          options={PRESETS}
          onChange={(p) => p !== 'custom' && onChange(presetRange(p, today))}
        />
        <div className="flex flex-wrap items-center gap-2">
          <DateField
            className="w-36"
            size="sm"
            label="Từ ngày"
            value={from}
            onChange={(v) => onChange({ from: v, to })}
          />
          <span aria-hidden className="text-fg-3">
            –
          </span>
          <DateField
            className="w-36"
            size="sm"
            label="Đến ngày"
            value={to}
            onChange={(v) => onChange({ from, to: v })}
          />
        </div>
        {zones && onZoneChange && (
          <Select
            aria-label="Khu vực"
            size="sm"
            className="w-full sm:w-52"
            active={Boolean(zoneId)}
            value={zoneId ?? ''}
            onChange={(e) => onZoneChange(e.target.value)}
          >
            <option value="">Mọi khu vực</option>
            {zones.map((z) => (
              <option key={z.zoneId} value={z.zoneId}>
                {z.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      {error && (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      )}
      {zoneId && zoneNote && <p className="text-meta text-fg-2">{zoneNote}</p>}
    </fieldset>
  )
}
