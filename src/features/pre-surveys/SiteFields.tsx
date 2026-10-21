import { useMemo } from 'react'
import { Button } from '@/components/common/ui/button'
import { Combobox } from '@/components/common/ui/combobox'
import { Field, Input, Radio, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { useHcmCommunesQuery } from '@/hooks/useCommunes'
import { HCM_PROVINCE } from '@/services/administrativeUnitService'
import type { FormErrors, SiteForm } from '@/features/pre-surveys/assessmentForm'
import { SURFACE_TYPES } from '@/common/preSurvey'
import { HCM_COORDINATE_HINT, isInHcm, mapsUrl } from '@/features/pre-surveys/preSurveyDisplay'
import { readDecimal } from '@/utils/number'

type Props = {
  value: SiteForm
  errors: FormErrors<SiteForm>
  onChange: (patch: Partial<SiteForm>) => void
}

// Ô nhập của bước "Địa điểm lắp đặt". State nằm ở trang cha
export function SiteFields({ value, errors, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Tên địa điểm"
        htmlFor="siteName"
        hint="Để phân biệt khi bạn có nhiều công trình."
        className="sm:col-span-2"
        error={errors.name}
      >
        <Input
          id="siteName"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-invalid={Boolean(errors.name)}
        />
      </Field>

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
        />
      </Field>

      <WardField value={value.ward} error={errors.ward ?? errors.communeCode} onChange={onChange} />

      <Field label="Tỉnh, thành phố" htmlFor="province" hint="Hiện chỉ nhận công trình tại TP.HCM.">
        {/* Ô chỉ đọc nền xám. Dùng dấu ! vì cx không gộp class trùng nhau */}
        <Input id="province" value={HCM_PROVINCE.name} readOnly className="bg-surface-2! text-fg-2!" />
      </Field>

      <CoordinateFields value={value} errors={errors} onChange={onChange} />

      <fieldset className="sm:col-span-2">
        <legend className="mb-3 text-body font-medium text-fg">Lắp trên bề mặt nào?</legend>
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {SURFACE_TYPES.map((type) => (
            <Radio
              key={type.value}
              name="installationSurfaceType"
              value={String(type.value)}
              checked={value.installationSurfaceType === String(type.value)}
              onChange={() => onChange({ installationSurfaceType: String(type.value) })}
              label={type.label}
              description={type.hint}
            />
          ))}
        </div>
        {errors.installationSurfaceType && (
          <p className="mt-2 text-meta text-danger" role="alert">
            {errors.installationSurfaceType}
          </p>
        )}
      </fieldset>

      <Field
        label="Vật liệu bề mặt"
        htmlFor="surfaceMaterial"
        hint="Không bắt buộc. Ví dụ: mái tôn, bê tông."
        error={errors.surfaceMaterial}
      >
        <Input
          id="surfaceMaterial"
          value={value.surfaceMaterial}
          onChange={(e) => onChange({ surfaceMaterial: e.target.value })}
        />
      </Field>

      <Field
        label="Ghi chú"
        htmlFor="siteNote"
        hint="Không bắt buộc. Ví dụ: giờ vào được công trình."
        className="sm:col-span-2"
        error={errors.note}
      >
        <Textarea id="siteNote" rows={3} value={value.note} onChange={(e) => onChange({ note: e.target.value })} />
      </Field>
    </div>
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
    <Field label="Phường, xã" htmlFor="ward" hint={wardHint(communes.isPending, communes.isError)} error={error}>
      <Combobox
        id="ward"
        value={value}
        onChange={changeWard}
        options={names}
        listLabel="Phường, xã của TP.HCM"
        emptyText={communes.isPending ? 'Đang tải danh sách…' : 'Không có phường, xã nào khớp.'}
        invalid={Boolean(error)}
      />
      {communes.isError && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-danger">
          Không tải được danh sách phường, xã.
          <Button size="sm" variant="ghost" bleed={false} icon="refresh" onClick={() => void communes.refetch()}>
            Thử lại
          </Button>
        </span>
      )}
    </Field>
  )
}

/** Toạ độ hợp lệ (đọc được số, nằm trong khoảng vĩ độ / kinh độ) mà ở ngoài TP.HCM */
function isValidButOutsideHcm(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return false
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false
  return !isInHcm(latitude, longitude)
}

// Toạ độ là bắt buộc: cần để lấy dữ liệu nắng (PVGIS), khí hậu (NASA POWER)
// và để kỹ thuật viên mở bản đồ tới công trình
function CoordinateFields({ value, errors, onChange }: Props) {
  const latitude = readDecimal(value.latitude)
  const longitude = readDecimal(value.longitude)
  // Toạ độ ngoài TP.HCM (gõ ngược 2 số, sai dấu...) thì chỉ cảnh báo, vẫn cho lưu
  const outsideHcm = isValidButOutsideHcm(latitude, longitude)

  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-body font-medium text-fg">Toạ độ công trình</legend>
      <p className="mt-1 max-w-prose text-meta text-fg-2">
        Cần để ước tính sản lượng điện và để kỹ thuật viên tìm tới công trình. Trên Google Maps, nhấn giữ vào công
        trình: cặp số hiện ra là vĩ độ, kinh độ.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Vĩ độ"
          htmlFor="latitude"
          required
          hint="Số đầu trong cặp toạ độ, ví dụ 10.9036."
          error={errors.latitude}
        >
          <Input
            id="latitude"
            inputMode="decimal"
            value={value.latitude}
            onChange={(e) => onChange({ latitude: e.target.value })}
            aria-invalid={Boolean(errors.latitude)}
            aria-required
          />
        </Field>
        <Field
          label="Kinh độ"
          htmlFor="longitude"
          required
          hint="Số thứ hai trong cặp toạ độ, ví dụ 106.7686."
          error={errors.longitude}
        >
          <Input
            id="longitude"
            inputMode="decimal"
            value={value.longitude}
            onChange={(e) => onChange({ longitude: e.target.value })}
            aria-invalid={Boolean(errors.longitude)}
            aria-required
          />
        </Field>
        {outsideHcm && latitude !== null && longitude !== null && (
          <Notice tone="warn" className="sm:col-span-2">
            Toạ độ này nằm ngoài TP.HCM, nơi Smart Solar đang nhận công trình. Kiểm tra lại: {HCM_COORDINATE_HINT}.{' '}
            <a className="ui-link font-medium" href={mapsUrl(latitude, longitude)} target="_blank" rel="noreferrer">
              Xem trên bản đồ
              <span className="sr-only"> (mở tab mới)</span>
            </a>
          </Notice>
        )}
      </div>
    </fieldset>
  )
}
