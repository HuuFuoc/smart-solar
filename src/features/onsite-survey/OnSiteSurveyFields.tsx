import { useState, type ReactNode } from 'react'
import {
  INSTALLATION_FEASIBILITIES,
  ONSITE_OBSTACLE_KINDS,
  ONSITE_SURVEY_LIMITS as LIMITS,
  ROOF_CONDITIONS,
  ROOF_MATERIAL_SUGGESTIONS,
  ROOF_TYPE_SUGGESTIONS,
} from '@/common/onsiteSurvey'
import { Button, IconButton } from '@/components/common/ui/button'
import { Combobox } from '@/components/common/ui/combobox'
import { Field, Input, Radio, Select, Textarea, WithUnit, fieldMessageId } from '@/components/common/ui/field'
import { Segmented } from '@/components/common/ui/segmented'
import { directionLabel } from '@/features/pre-surveys/preSurveyDisplay'
import { formatCoordinates } from '@/features/onsite-survey/onSiteSurveyDisplay'
import {
  newObstacleRow,
  obstacleErrorKey,
  type ObstacleRow,
  type OnSiteSurveyErrors,
  type OnSiteSurveyForm,
} from '@/features/onsite-survey/onSiteSurveyForm'
import { readDecimal } from '@/utils/number'

/** Số khách khai lúc đánh giá sơ bộ, hiện làm gợi ý để đối chiếu */
export type DeclaredValues = {
  widthM: number | null
  lengthM: number | null
  usableAreaM2: number | null
  tiltDegree: number | null
  azimuthDegree: number | null
}

const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const declaredText = (value: number | null | undefined, unit: string) =>
  value == null ? null : `Khách khai: ${num.format(value)} ${unit}.`
const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' ') || undefined

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <legend className="float-left mb-4 w-full text-body font-semibold text-fg">{title}</legend>
      <div className="clear-left space-y-4">{children}</div>
    </fieldset>
  )
}

// Ô nhập của biên bản khảo sát tại công trình. State nằm ở nơi gọi; ô có * là bắt buộc khi hoàn thành
export function OnSiteSurveyFields({
  value,
  errors,
  onChange,
  declared,
  disabled,
}: {
  value: OnSiteSurveyForm
  errors: OnSiteSurveyErrors
  onChange: (patch: Partial<OnSiteSurveyForm>) => void
  declared: DeclaredValues | null
  disabled?: boolean
}) {
  const azimuth = readDecimal(value.azimuthDegree)
  const length = readDecimal(value.roofLengthM)
  const width = readDecimal(value.roofWidthM)
  const maxArea = length && width ? length * width : null

  function numberInput(field: keyof OnSiteSurveyForm, id: string) {
    return (
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        value={value[field] as string}
        onChange={(e) => onChange({ [field]: e.target.value })}
        aria-invalid={Boolean(errors[field])}
        aria-describedby={fieldMessageId(id)}
      />
    )
  }

  function textArea(field: keyof OnSiteSurveyForm, id: string, maxLength: number, rows = 3) {
    return (
      <Textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        value={value[field] as string}
        onChange={(e) => onChange({ [field]: e.target.value })}
        aria-invalid={Boolean(errors[field])}
        aria-describedby={fieldMessageId(id)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-meta text-fg-2">
        Ô có dấu <span className="text-danger">*</span> phải có trước khi hoàn thành khảo sát. Lưu được khi chưa điền
        đủ.
      </p>

      <Section title="Mái">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Loại mái" htmlFor="os-roofType" required hint="Chọn gợi ý hoặc gõ." error={errors.roofType}>
            <Combobox
              id="os-roofType"
              value={value.roofType}
              onChange={(roofType) => onChange({ roofType: roofType.slice(0, LIMITS.roofTextLength) })}
              options={ROOF_TYPE_SUGGESTIONS}
              listLabel="Loại mái thường gặp"
              emptyText="Không có gợi ý khớp, giữ chữ đã gõ."
              invalid={Boolean(errors.roofType)}
              required
              describedBy={fieldMessageId('os-roofType')}
              disabled={disabled}
            />
          </Field>
          <Field
            label="Vật liệu mái"
            htmlFor="os-roofMaterial"
            required
            hint="Chọn gợi ý hoặc gõ."
            error={errors.roofMaterial}
          >
            <Combobox
              id="os-roofMaterial"
              value={value.roofMaterial}
              onChange={(roofMaterial) => onChange({ roofMaterial: roofMaterial.slice(0, LIMITS.roofTextLength) })}
              options={ROOF_MATERIAL_SUGGESTIONS}
              listLabel="Vật liệu mái thường gặp"
              emptyText="Không có gợi ý khớp, giữ chữ đã gõ."
              invalid={Boolean(errors.roofMaterial)}
              required
              describedBy={fieldMessageId('os-roofMaterial')}
              disabled={disabled}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Chiều dài"
            htmlFor="os-roofLengthM"
            required
            hint={join('Đo theo chiều dốc.', declaredText(declared?.lengthM, 'm'))}
            error={errors.roofLengthM}
          >
            <WithUnit unit="m">{numberInput('roofLengthM', 'os-roofLengthM')}</WithUnit>
          </Field>
          <Field
            label="Chiều rộng"
            htmlFor="os-roofWidthM"
            required
            hint={join('Dọc theo mép cao.', declaredText(declared?.widthM, 'm'))}
            error={errors.roofWidthM}
          >
            <WithUnit unit="m">{numberInput('roofWidthM', 'os-roofWidthM')}</WithUnit>
          </Field>
          <Field
            label="Diện tích lắp được"
            htmlFor="os-usableAreaM2"
            required
            hint={join(
              maxArea ? `Tối đa ${num.format(maxArea)} m².` : undefined,
              declaredText(declared?.usableAreaM2, 'm²'),
            )}
            error={errors.usableAreaM2}
          >
            <WithUnit unit="m²">{numberInput('usableAreaM2', 'os-usableAreaM2')}</WithUnit>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Độ dốc"
            htmlFor="os-tiltDegree"
            required
            hint={join('Mái bằng là 0.', declaredText(declared?.tiltDegree, 'độ'))}
            error={errors.tiltDegree}
          >
            <WithUnit unit="độ">{numberInput('tiltDegree', 'os-tiltDegree')}</WithUnit>
          </Field>
          <Field
            label="Hướng mái"
            htmlFor="os-azimuthDegree"
            required
            hint={join(
              azimuth !== null && azimuth >= 0 && azimuth < 360
                ? `Hướng ${directionLabel(azimuth)}.`
                : '0 là Bắc, 90 là Đông, 180 là Nam.',
              declaredText(declared?.azimuthDegree, 'độ'),
            )}
            error={errors.azimuthDegree}
          >
            <WithUnit unit="độ">{numberInput('azimuthDegree', 'os-azimuthDegree')}</WithUnit>
          </Field>
          <fieldset aria-describedby={errors.roofCondition ? fieldMessageId('os-roofCondition') : undefined}>
            <legend className="mb-2 text-body font-medium text-fg">
              Tình trạng mái
              <span aria-hidden className="text-danger">
                {' *'}
              </span>
            </legend>
            <Segmented
              label="Tình trạng mái"
              options={ROOF_CONDITIONS.map(({ value: v, label }) => ({ value: v as string, label }))}
              value={value.roofCondition}
              onChange={(roofCondition) => !disabled && onChange({ roofCondition })}
            />
            {errors.roofCondition && (
              <p id={fieldMessageId('os-roofCondition')} className="mt-2 text-meta text-danger" role="alert">
                {errors.roofCondition}
              </p>
            )}
          </fieldset>
        </div>
      </Section>

      <Section title="Điện">
        <Field
          label="Tủ điện"
          htmlFor="os-electricalCabinetNotes"
          required
          hint="Vị trí, loại tủ, aptomat tổng, chỗ còn trống."
          error={errors.electricalCabinetNotes}
        >
          {textArea('electricalCabinetNotes', 'os-electricalCabinetNotes', LIMITS.longNoteLength)}
        </Field>
        <Field
          label="Đấu nối điện"
          htmlFor="os-electricalConnectionNotes"
          hint="Không bắt buộc. Đường đi dây, điểm đấu vào lưới."
          error={errors.electricalConnectionNotes}
        >
          {textArea('electricalConnectionNotes', 'os-electricalConnectionNotes', LIMITS.longNoteLength, 2)}
        </Field>
        <Field
          label="Vị trí đặt inverter"
          htmlFor="os-proposedInverterLocation"
          hint="Không bắt buộc."
          error={errors.proposedInverterLocation}
        >
          <Input
            id="os-proposedInverterLocation"
            maxLength={LIMITS.inverterLocationLength}
            disabled={disabled}
            value={value.proposedInverterLocation}
            onChange={(e) => onChange({ proposedInverterLocation: e.target.value })}
            aria-describedby={fieldMessageId('os-proposedInverterLocation')}
          />
        </Field>
      </Section>

      <Section title="Phương án lắp đặt">
        <fieldset
          aria-describedby={errors.installationFeasibility ? fieldMessageId('os-installationFeasibility') : undefined}
        >
          <legend className="mb-3 text-body font-medium text-fg">
            Khả năng lắp đặt
            <span aria-hidden className="text-danger">
              {' *'}
            </span>
          </legend>
          <div className="space-y-3">
            {INSTALLATION_FEASIBILITIES.map((option) => (
              <Radio
                key={option.value}
                name="os-installationFeasibility"
                value={option.value}
                disabled={disabled}
                checked={value.installationFeasibility === option.value}
                onChange={() => onChange({ installationFeasibility: option.value })}
                label={option.label}
                description={option.hint}
              />
            ))}
          </div>
          {errors.installationFeasibility && (
            <p id={fieldMessageId('os-installationFeasibility')} className="mt-2 text-meta text-danger" role="alert">
              {errors.installationFeasibility}
            </p>
          )}
        </fieldset>
        <Field
          label="Bố trí tấm pin"
          htmlFor="os-proposedPanelLayoutNotes"
          hint="Không bắt buộc. Số dãy, hướng đặt tấm, chỗ cần tránh."
          error={errors.proposedPanelLayoutNotes}
        >
          {textArea('proposedPanelLayoutNotes', 'os-proposedPanelLayoutNotes', LIMITS.longNoteLength, 2)}
        </Field>
      </Section>

      <Section title={`Vật cản (${value.obstacles.length})`}>
        <ObstacleRows rows={value.obstacles} errors={errors} disabled={disabled} onChange={onChange} />
      </Section>

      <Section title="Vị trí và ghi chú">
        <LocationField value={value} disabled={disabled} onChange={onChange} />
        <Field label="Ghi chú" htmlFor="os-notes" hint="Không bắt buộc." error={errors.notes}>
          {textArea('notes', 'os-notes', LIMITS.notesLength)}
        </Field>
      </Section>
    </div>
  )
}

function ObstacleRows({
  rows,
  errors,
  disabled,
  onChange,
}: {
  rows: ObstacleRow[]
  errors: OnSiteSurveyErrors
  disabled?: boolean
  onChange: (patch: Partial<OnSiteSurveyForm>) => void
}) {
  const update = (index: number, patch: Partial<ObstacleRow>) =>
    onChange({ obstacles: rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) })

  return (
    <>
      {rows.length === 0 && <p className="text-body text-fg-2">Chưa ghi vật cản nào.</p>}
      {rows.map((row, i) => {
        const id = `os-obstacle-${row.key}`
        const heightError = errors[obstacleErrorKey(i, 'heightM')]
        const areaError = errors[obstacleErrorKey(i, 'areaM2')]
        return (
          <div
            key={row.key}
            className="grid items-start gap-3 rounded-container border border-line p-3 sm:grid-cols-[12rem_minmax(0,1fr)_7rem_7rem_auto]"
          >
            <Field label={`Loại ${i + 1}`} htmlFor={`${id}-kind`}>
              <Select
                id={`${id}-kind`}
                disabled={disabled}
                value={row.kind}
                onChange={(e) => update(i, { kind: e.target.value })}
              >
                {ONSITE_OBSTACLE_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mô tả" htmlFor={`${id}-description`}>
              <Input
                id={`${id}-description`}
                maxLength={LIMITS.obstacleDescriptionLength}
                disabled={disabled}
                value={row.description}
                onChange={(e) => update(i, { description: e.target.value })}
              />
            </Field>
            <Field label="Cao (m)" htmlFor={`${id}-height`} error={heightError}>
              <Input
                id={`${id}-height`}
                inputMode="decimal"
                disabled={disabled}
                value={row.heightM}
                onChange={(e) => update(i, { heightM: e.target.value })}
                aria-invalid={Boolean(heightError)}
                aria-describedby={fieldMessageId(`${id}-height`)}
              />
            </Field>
            <Field label="Diện tích (m²)" htmlFor={`${id}-area`} error={areaError}>
              <Input
                id={`${id}-area`}
                inputMode="decimal"
                disabled={disabled}
                value={row.areaM2}
                onChange={(e) => update(i, { areaM2: e.target.value })}
                aria-invalid={Boolean(areaError)}
                aria-describedby={fieldMessageId(`${id}-area`)}
              />
            </Field>
            <IconButton
              icon="delete"
              label={`Xoá vật cản ${i + 1}`}
              variant="danger-quiet"
              className="sm:mt-7"
              disabled={disabled}
              onClick={() => onChange({ obstacles: rows.filter((_, j) => j !== i) })}
            />
          </div>
        )
      })}
      {rows.length < LIMITS.maxObstacles && (
        <Button
          variant="soft"
          size="sm"
          icon="add"
          disabled={disabled}
          onClick={() => onChange({ obstacles: [...rows, newObstacleRow()] })}
        >
          Thêm vật cản
        </Button>
      )}
    </>
  )
}

// Toạ độ lấy từ GPS của máy tại công trình, không gõ tay
function LocationField({
  value,
  disabled,
  onChange,
}: {
  value: OnSiteSurveyForm
  disabled?: boolean
  onChange: (patch: Partial<OnSiteSurveyForm>) => void
}) {
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLocation = value.measuredLatitude !== null && value.measuredLongitude !== null

  function capture() {
    if (!('geolocation' in navigator)) {
      setError('Thiết bị này không lấy được vị trí.')
      return
    }
    setError(null)
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const round = (n: number) => Math.round(n * 1e6) / 1e6
        onChange({
          measuredLatitude: round(position.coords.latitude),
          measuredLongitude: round(position.coords.longitude),
        })
        setLocating(false)
      },
      (e) => {
        setError(
          e.code === e.PERMISSION_DENIED
            ? 'Trình duyệt chưa cho phép lấy vị trí. Bật quyền vị trí cho trang này rồi thử lại.'
            : 'Chưa lấy được vị trí. Ra chỗ thoáng rồi thử lại.',
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-body font-medium text-fg">Toạ độ công trình</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="soft" size="sm" icon="my_location" disabled={disabled || locating} onClick={capture}>
          {locating ? 'Đang lấy vị trí…' : hasLocation ? 'Lấy lại vị trí' : 'Lấy vị trí hiện tại'}
        </Button>
        {hasLocation && (
          <>
            <span className="tnum text-body text-fg">
              {formatCoordinates(value.measuredLatitude, value.measuredLongitude)}
            </span>
            <Button
              variant="danger-quiet"
              size="sm"
              icon="close"
              disabled={disabled}
              onClick={() => onChange({ measuredLatitude: null, measuredLongitude: null })}
            >
              Bỏ toạ độ
            </Button>
          </>
        )}
      </div>
      {error ? (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-meta text-fg-3">Không bắt buộc. Đứng tại công trình rồi bấm để ghi toạ độ GPS của máy.</p>
      )}
    </div>
  )
}
