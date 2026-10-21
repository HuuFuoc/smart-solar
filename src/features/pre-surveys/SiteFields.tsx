import { useMemo } from 'react'
import { Button } from '@/components/common/ui/button'
import { Combobox } from '@/components/common/ui/combobox'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Field, Input, Textarea, fieldMessageId } from '@/components/common/ui/field'
import { useHcmCommunesQuery } from '@/hooks/useCommunes'
import { HCM_PROVINCE } from '@/services/administrativeUnitService'
import type { FormErrors, SiteForm } from '@/features/pre-surveys/assessmentForm'
import { SURFACE_TYPES } from '@/common/preSurvey'
import { cx } from '@/utils/cx'

type Props = {
  value: SiteForm
  errors: FormErrors<SiteForm>
  onChange: (patch: Partial<SiteForm>) => void
}

// Ô nhập của bước "Địa điểm lắp đặt". State nằm ở trang cha
// Thứ tự: tên, địa chỉ (tỉnh cố định → phường, xã → số nhà), bề mặt lắp, ghi chú
export function SiteFields({ value, errors, onChange }: Props) {
  const surfaceError = errors.installationSurfaceType
  return (
    <div className="space-y-6">
      <p className="text-meta text-fg-2">
        Ô có dấu <span className="text-danger">*</span> là bắt buộc.
      </p>

      <Field
        label="Tên địa điểm"
        htmlFor="siteName"
        required
        hint="Để phân biệt khi bạn có nhiều công trình."
        error={errors.name}
      >
        <Input
          id="siteName"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={fieldMessageId('siteName')}
        />
      </Field>

      <fieldset className="border-t border-line pt-5">
        <legend className="float-left mb-4 w-full text-body font-semibold text-fg">Địa chỉ công trình</legend>
        <div className="clear-left grid gap-4 sm:grid-cols-2">
          <Field label="Tỉnh, thành phố" htmlFor="province" hint="Hiện chỉ nhận công trình tại TP.HCM.">
            {/* Ô chỉ đọc nền xám, vẫn focus được để đọc. Dùng dấu ! vì cx không gộp class trùng nhau */}
            <Input
              id="province"
              value={HCM_PROVINCE.name}
              readOnly
              aria-describedby={fieldMessageId('province')}
              className="bg-surface-2! text-fg-2!"
            />
          </Field>

          <WardField value={value.ward} error={errors.ward ?? errors.communeCode} onChange={onChange} />

          <Field
            label="Số nhà, tên đường"
            htmlFor="streetLine"
            hint="Không bắt buộc."
            className="sm:col-span-2"
            error={errors.streetLine}
          >
            <Input
              id="streetLine"
              autoComplete="address-line1"
              value={value.streetLine}
              onChange={(e) => onChange({ streetLine: e.target.value })}
              aria-invalid={Boolean(errors.streetLine)}
              aria-describedby={fieldMessageId('streetLine')}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset
        className="border-t border-line pt-5"
        aria-describedby={surfaceError ? fieldMessageId('installationSurfaceType') : undefined}
      >
        <legend className="float-left mb-4 w-full text-body font-semibold text-fg">
          Lắp trên bề mặt nào?
          <span aria-hidden className="text-danger">
            {' *'}
          </span>
        </legend>
        <div className="clear-left grid gap-3 sm:grid-cols-2">
          {SURFACE_TYPES.map((type) => (
            <SurfaceTypeCard
              key={type.value}
              icon={type.icon}
              label={type.label}
              description={type.hint}
              value={String(type.value)}
              checked={value.installationSurfaceType === String(type.value)}
              invalid={Boolean(surfaceError)}
              onSelect={() => onChange({ installationSurfaceType: String(type.value) })}
            />
          ))}
        </div>
        {surfaceError && (
          <p id={fieldMessageId('installationSurfaceType')} className="mt-2 text-meta text-danger" role="alert">
            {surfaceError}
          </p>
        )}

        <Field
          label="Vật liệu bề mặt"
          htmlFor="surfaceMaterial"
          hint="Không bắt buộc. Ví dụ: mái tôn, bê tông."
          error={errors.surfaceMaterial}
          className="mt-5 sm:w-1/2 sm:pr-2"
        >
          <Input
            id="surfaceMaterial"
            value={value.surfaceMaterial}
            onChange={(e) => onChange({ surfaceMaterial: e.target.value })}
            aria-invalid={Boolean(errors.surfaceMaterial)}
            aria-describedby={fieldMessageId('surfaceMaterial')}
          />
        </Field>
      </fieldset>

      <Field
        label="Ghi chú"
        htmlFor="siteNote"
        hint="Không bắt buộc. Ví dụ: giờ vào được công trình."
        error={errors.note}
        className="border-t border-line pt-5"
      >
        <Textarea
          id="siteNote"
          rows={3}
          value={value.note}
          onChange={(e) => onChange({ note: e.target.value })}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={fieldMessageId('siteNote')}
        />
      </Field>
    </div>
  )
}

// Thẻ chọn bề mặt: cả thẻ là nhãn của một radio ẩn nên bấm đâu cũng chọn, phím mũi tên vẫn chuyển lựa chọn
// Đang chọn: viền và nền xanh nhạt, dấu tích tô đặc (không chỉ dựa vào màu)
function SurfaceTypeCard({
  icon,
  label,
  description,
  value,
  checked,
  invalid,
  onSelect,
}: {
  icon: string
  label: string
  description: string
  value: string
  checked: boolean
  invalid: boolean
  onSelect: () => void
}) {
  return (
    <label
      className={cx(
        'press flex min-h-16 cursor-pointer items-start gap-3 rounded-control border p-3',
        'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
        checked
          ? 'border-accent bg-accent-soft'
          : cx('bg-canvas hover:border-fg-3', invalid ? 'border-danger' : 'border-line-2'),
      )}
    >
      <input
        type="radio"
        name="installationSurfaceType"
        value={value}
        checked={checked}
        onChange={onSelect}
        aria-invalid={invalid || undefined}
        className="sr-only"
      />
      <Icon
        name={icon}
        className={cx('mt-px shrink-0 text-[24px]', checked ? 'icon-fill text-accent-fg' : 'text-fg-2')}
      />
      <span className="min-w-0 flex-1">
        <span className={cx('block text-body text-fg', checked ? 'font-semibold' : 'font-medium')}>{label}</span>
        <span className="block text-meta text-fg-2">{description}</span>
      </span>
      <Icon
        name={checked ? 'check_circle' : 'radio_button_unchecked'}
        className={cx('shrink-0 text-[20px]', checked ? 'icon-fill text-accent-fg' : 'text-fg-3')}
      />
    </label>
  )
}

/** Câu gợi ý dưới ô phường, xã theo trạng thái tải danh sách */
function wardHint(isPending: boolean, isError: boolean) {
  if (isPending) return 'Đang tải danh sách phường, xã…'
  if (isError) return undefined
  return 'Gõ tên để tìm, không cần dấu. Từ 01/07/2025 TP.HCM không còn cấp quận, huyện.'
}

// Chọn phường, xã của TP.HCM từ danh sách của backend (gõ không dấu vẫn tìm được).
// Lưu cả tên (để hiển thị) và mã (backend dùng mã để biết công trình thuộc khu vực nào).
function WardField({
  value,
  error,
  onChange,
}: {
  value: string
  error?: string
  onChange: (patch: Partial<SiteForm>) => void
}) {
  const communes = useHcmCommunesQuery()
  const names = useMemo(() => (communes.data ?? []).map((commune) => commune.name), [communes.data])

  function changeWard(ward: string) {
    // Chỉ có mã khi tên trùng đúng một mục trong danh sách
    const commune = communes.data?.find((item) => item.name === ward)
    onChange({ ward, communeCode: commune?.code ?? '' })
  }

  return (
    <Field
      label="Phường, xã"
      htmlFor="ward"
      required
      hint={wardHint(communes.isPending, communes.isError)}
      error={error}
    >
      <Combobox
        id="ward"
        value={value}
        onChange={changeWard}
        options={names}
        listLabel="Phường, xã của TP.HCM"
        emptyText={communes.isPending ? 'Đang tải danh sách…' : 'Không có phường, xã nào khớp.'}
        invalid={Boolean(error)}
        required
        describedBy={fieldMessageId('ward')}
      />
      {communes.isError && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-danger">
          Không tải được danh sách phường, xã.
          <Button size="sm" variant="secondary" icon="refresh" onClick={() => void communes.refetch()}>
            Thử lại
          </Button>
        </span>
      )}
    </Field>
  )
}
