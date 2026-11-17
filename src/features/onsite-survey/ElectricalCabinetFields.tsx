import {
  CABINET_LOCATION_SUGGESTIONS,
  CABINET_PHASES,
  CABINET_SPARE_SPACES,
  ONSITE_SURVEY_LIMITS as LIMITS,
  MAIN_BREAKER_SUGGESTIONS,
} from '@/common/onsiteSurvey'
import { Combobox } from '@/components/common/ui/combobox'
import { Field, Select, Textarea, fieldMessageId } from '@/components/common/ui/field'
import {
  cabinetNoteBudget,
  composeCabinetNotes,
  parseCabinetNotes,
  type CabinetParts,
} from '@/features/onsite-survey/electricalCabinet'

const SHORT_TEXT_LENGTH = 100

// Ô "Tủ điện" tách thành vài ô chọn, vẫn ghi thành một đoạn chữ như backend nhận
export function ElectricalCabinetFields({
  value,
  error,
  disabled,
  onChange,
}: {
  value: string
  error?: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const parts = parseCabinetNotes(value)
  const set = (patch: Partial<CabinetParts>) => onChange(composeCabinetNotes({ ...parts, ...patch }))
  const errorId = fieldMessageId('os-cabinet')

  function choice(key: 'phase' | 'spareSpace', id: string, label: string, options: string[]) {
    const current = parts[key]
    return (
      <Field label={label} htmlFor={id}>
        <Select id={id} disabled={disabled} value={current} onChange={(e) => set({ [key]: e.target.value })}>
          <option value="">Chưa chọn</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          {/* Giá trị gõ tay ở biên bản cũ vẫn hiện, không bị đổi ngầm */}
          {current !== '' && !options.includes(current) && <option value={current}>{current}</option>}
        </Select>
      </Field>
    )
  }

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-3 text-body font-medium text-fg">
        Tủ điện
        <span aria-hidden className="text-fg-2">
          {' *'}
        </span>
      </legend>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Vị trí tủ" htmlFor="os-cabinet-location" hint="Chọn gợi ý hoặc gõ.">
            <Combobox
              id="os-cabinet-location"
              value={parts.location}
              onChange={(location) => set({ location: location.slice(0, SHORT_TEXT_LENGTH) })}
              options={CABINET_LOCATION_SUGGESTIONS}
              listLabel="Vị trí tủ điện thường gặp"
              emptyText="Không có gợi ý khớp, giữ chữ đã gõ."
              invalid={Boolean(error)}
              describedBy={fieldMessageId('os-cabinet-location')}
              disabled={disabled}
            />
          </Field>
          {choice('phase', 'os-cabinet-phase', 'Nguồn điện', CABINET_PHASES)}
          <Field label="Aptomat tổng" htmlFor="os-cabinet-breaker" hint="Chọn gợi ý hoặc gõ.">
            <Combobox
              id="os-cabinet-breaker"
              value={parts.mainBreaker}
              onChange={(mainBreaker) => set({ mainBreaker: mainBreaker.slice(0, SHORT_TEXT_LENGTH) })}
              options={MAIN_BREAKER_SUGGESTIONS}
              listLabel="Dòng định mức aptomat tổng"
              emptyText="Không có gợi ý khớp, giữ chữ đã gõ."
              describedBy={fieldMessageId('os-cabinet-breaker')}
              disabled={disabled}
            />
          </Field>
          {choice('spareSpace', 'os-cabinet-space', 'Chỗ trống trong tủ', CABINET_SPARE_SPACES)}
        </div>
        <Field label="Ghi chú thêm về tủ điện" htmlFor="os-cabinet-note" optional>
          <Textarea
            id="os-cabinet-note"
            rows={2}
            maxLength={cabinetNoteBudget(parts, LIMITS.longNoteLength)}
            disabled={disabled}
            value={parts.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </Field>
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-meta text-danger" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
