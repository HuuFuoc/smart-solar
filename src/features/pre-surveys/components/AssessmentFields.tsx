import { useMemo, type ReactNode } from 'react'
import { Button } from '@/components/common/ui/button'
import { Combobox } from '@/components/common/ui/combobox'
import { Field, Input, Radio, Textarea } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import {
  COMPASS_GRID,
  CUSTOMER_TYPES,
  HCM_COORDINATE_HINT,
  SURFACE_TYPES,
  isInHcm,
  mapsUrl,
} from '@/features/pre-surveys/components/preSurveyDisplay'
import { toNumber, type FormErrors, type ProfileForm, type SiteForm } from '@/features/pre-surveys/components/assessmentForm'
import { useHcmWardsQuery } from '@/features/pre-surveys/hooks/useHcmWards'
import { HCM_PROVINCE } from '@/features/pre-surveys/services/provinceService'

/* Ô nhập của hai bước đầu màn đánh giá sơ bộ (hồ sơ, địa điểm) + la bàn và ô có đơn vị dùng ở bước mặt lắp, mô phỏng.
   Trang giữ state; component chỉ vẽ và báo thay đổi. */

type FieldsProps<F> = {
  value: F
  errors: FormErrors<F>
  onChange: (patch: Partial<F>) => void
}

/*
  Toạ độ bắt buộc từ 12/10/2026 (trước đó gập lại, không bắt buộc): backend dùng nó để tính đường đi của kỹ thuật viên và
  xếp giờ khảo sát (không có thì không đặt được lịch), và để ước tính sản lượng (PVGIS), khí hậu (NASA POWER). Ít khách
  biết toạ độ nên chữ hướng dẫn nói cách lấy trên Google Maps.
*/
function CoordinateFields({ value, errors, onChange }: FieldsProps<SiteForm>) {
  // Cảnh báo (vẫn cho lưu, người dùng chốt 10/10/2026) khi cả hai số hợp lệ mà nằm ngoài TP.HCM: gõ ngược hai số, sai dấu…
  const lat = toNumber(value.latitude)
  const lon = toNumber(value.longitude)
  const outside =
    lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !isInHcm(lat, lon)
  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-body font-medium text-fg">Toạ độ công trình</legend>
      <p className="mt-1 max-w-prose text-meta text-fg-2">
        Cần để xếp lịch khảo sát (tính đường đi của kỹ thuật viên) và ước tính sản lượng điện. Trên Google Maps, nhấn giữ vào
        công trình: cặp số hiện ra là vĩ độ, kinh độ.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Vĩ độ" htmlFor="latitude" required hint="Số đầu trong cặp toạ độ, ví dụ 10.9036." error={errors.latitude}>
          <Input
            id="latitude"
            inputMode="decimal"
            value={value.latitude}
            onChange={(e) => onChange({ latitude: e.target.value })}
            aria-invalid={Boolean(errors.latitude)}
            aria-required
          />
        </Field>
        <Field label="Kinh độ" htmlFor="longitude" required hint="Số thứ hai trong cặp toạ độ, ví dụ 106.7686." error={errors.longitude}>
          <Input
            id="longitude"
            inputMode="decimal"
            value={value.longitude}
            onChange={(e) => onChange({ longitude: e.target.value })}
            aria-invalid={Boolean(errors.longitude)}
            aria-required
          />
        </Field>
        {outside && (
          <Notice tone="warn" className="sm:col-span-2">
            Toạ độ này nằm ngoài TP.HCM, nơi Smart Solar đang nhận công trình. Kiểm tra lại: {HCM_COORDINATE_HINT}.{' '}
            <a className="ui-link font-medium" href={mapsUrl(lat, lon)} target="_blank" rel="noreferrer">
              Xem trên bản đồ
              <span className="sr-only"> (mở tab mới)</span>
            </a>
          </Notice>
        )}
      </div>
    </fieldset>
  )
}

/*
  Hướng chọn trên la bàn 3×3 thay vì gõ góc phương vị: khách hiểu "mái quay về hướng Nam"
  chứ không hiểu "180°". Radio thật (ẩn) giữ đúng hành vi bàn phím: Tab vào nhóm, mũi tên đổi hướng.
  Dùng cho hướng mặt mái (bước mặt lắp) và hướng tấm pin của khung nghiêng (bước mô phỏng): `name` phải khác nhau.
*/
export function CompassPicker({
  value,
  error,
  onChange,
  name = 'azimuth',
  legend = 'Mặt mái quay về hướng nào?',
  hint = 'Hướng mặt mái nhìn ra (phía mép thấp). Mái bằng thì chọn Nam.',
  className = 'sm:col-span-2',
}: {
  value: string
  error?: string
  onChange: (degree: string) => void
  name?: string
  legend?: string
  hint?: string
  className?: string
}) {
  return (
    <fieldset className={className}>
      <legend className="text-body font-medium text-fg">{legend}</legend>
      <p className="mt-1 mb-3 text-meta text-fg-3">{hint}</p>
      <div className="grid max-w-sm grid-cols-3 gap-2">
        {COMPASS_GRID.map((cell, i) =>
          cell === null ? (
            <div
              key="roof"
              aria-hidden
              className="flex h-11 items-center justify-center rounded-control border border-dashed border-line-2 text-meta text-fg-3"
            >
              Mái
            </div>
          ) : (
            <label
              key={i}
              className="press flex h-11 cursor-pointer items-center justify-center rounded-control border border-line-2 px-2 text-center text-body text-fg-2 hover:border-fg hover:text-fg has-checked:border-accent has-checked:bg-accent-soft has-checked:font-semibold has-checked:text-fg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                value={String(cell.degree)}
                checked={value !== '' && Number(value) === cell.degree}
                onChange={() => onChange(String(cell.degree))}
                aria-invalid={Boolean(error)}
              />
              {cell.label}
            </label>
          ),
        )}
      </div>
      {error && (
        <p className="mt-2 text-meta text-danger" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}

export function WithUnit({ unit, children }: { unit: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {children}
      <span className="text-body text-fg-2">{unit}</span>
    </div>
  )
}

export function ProfileFields({ value, errors, onChange }: FieldsProps<ProfileForm>) {
  const business = value.customerType === '2'
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-body font-medium text-fg">Bạn lắp đặt cho</legend>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {CUSTOMER_TYPES.map((t) => (
            <Radio
              key={t.value}
              name="customerType"
              value={String(t.value)}
              checked={value.customerType === String(t.value)}
              onChange={() => onChange({ customerType: String(t.value) as ProfileForm['customerType'] })}
              label={t.label}
            />
          ))}
        </div>
      </fieldset>
      {business && (
        <>
          <Field label="Tên doanh nghiệp" htmlFor="companyName" hint="Không bắt buộc." error={errors.companyName}>
            <Input
              id="companyName"
              autoComplete="organization"
              value={value.companyName}
              onChange={(e) => onChange({ companyName: e.target.value })}
              aria-invalid={Boolean(errors.companyName)}
            />
          </Field>
          <Field label="Mã số thuế" htmlFor="taxCode" hint="Không bắt buộc." error={errors.taxCode}>
            <Input
              id="taxCode"
              inputMode="numeric"
              value={value.taxCode}
              onChange={(e) => onChange({ taxCode: e.target.value })}
              aria-invalid={Boolean(errors.taxCode)}
            />
          </Field>
        </>
      )}
      <Field label="Ghi chú" htmlFor="profileNote" hint="Không bắt buộc." className="sm:col-span-2" error={errors.note}>
        <Textarea id="profileNote" rows={3} value={value.note} onChange={(e) => onChange({ note: e.target.value })} />
      </Field>
    </div>
  )
}

/*
  Phường, xã của TP.HCM (2 cấp từ 01/07/2025) chọn trong danh sách tải từ provinces.open-api.vn, gõ không dấu vẫn tìm
  được. Không tải được danh sách thì vẫn gõ tay được (khách không bị chặn ở bước này) và có nút thử lại.
*/
function WardField({ value, error, onChange }: { value: string; error?: string; onChange: (ward: string) => void }) {
  const wards = useHcmWardsQuery()
  const names = useMemo(() => (wards.data ?? []).map((w) => w.name), [wards.data])
  const hint = wards.isPending
    ? 'Đang tải danh sách phường, xã…'
    : wards.isError
      ? undefined
      : 'Gõ tên để tìm, không cần dấu. Từ 01/07/2025 TP.HCM không còn cấp quận, huyện.'
  return (
    <Field label="Phường, xã" htmlFor="ward" hint={hint} error={error}>
      <Combobox
        id="ward"
        value={value}
        onChange={onChange}
        options={names}
        listLabel="Phường, xã của TP.HCM"
        emptyText={wards.isPending ? 'Đang tải danh sách…' : 'Không có phường, xã nào khớp.'}
        invalid={Boolean(error)}
      />
      {wards.isError && !error && (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-fg-2">
          Không tải được danh sách phường, xã; vẫn gõ tay được.
          <Button size="sm" variant="ghost" bleed={false} icon="refresh" onClick={() => void wards.refetch()}>
            Thử lại
          </Button>
        </span>
      )}
    </Field>
  )
}

export function SiteFields({ value, errors, onChange }: FieldsProps<SiteForm>) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tên địa điểm" htmlFor="siteName" hint="Để phân biệt khi bạn có nhiều công trình." className="sm:col-span-2" error={errors.name}>
        <Input id="siteName" value={value.name} onChange={(e) => onChange({ name: e.target.value })} aria-invalid={Boolean(errors.name)} />
      </Field>
      <Field label="Số nhà, tên đường" htmlFor="streetLine" hint="Không bắt buộc." className="sm:col-span-2" error={errors.streetLine}>
        <Input
          id="streetLine"
          autoComplete="address-line1"
          value={value.streetLine}
          onChange={(e) => onChange({ streetLine: e.target.value })}
          aria-invalid={Boolean(errors.streetLine)}
        />
      </Field>
      <WardField value={value.ward} error={errors.ward} onChange={(ward) => onChange({ ward })} />
      <Field label="Tỉnh, thành phố" htmlFor="province" hint="Hiện chỉ nhận công trình tại TP.HCM.">
        {/* Giá trị cố định: ô chỉ đọc nền xám (`!` vì cx không gộp class, màu nền / chữ của ô nhập thường sẽ giành nhau). */}
        <Input id="province" value={HCM_PROVINCE.name} readOnly className="bg-surface-2! text-fg-2!" />
      </Field>
      <CoordinateFields value={value} errors={errors} onChange={onChange} />
      <fieldset className="sm:col-span-2">
        <legend className="mb-3 text-body font-medium text-fg">Lắp trên bề mặt nào?</legend>
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {SURFACE_TYPES.map((t) => (
            <Radio
              key={t.value}
              name="installationSurfaceType"
              value={String(t.value)}
              checked={value.installationSurfaceType === String(t.value)}
              onChange={() => onChange({ installationSurfaceType: String(t.value) })}
              label={t.label}
              description={t.hint}
            />
          ))}
        </div>
        {errors.installationSurfaceType && (
          <p className="mt-2 text-meta text-danger" role="alert">
            {errors.installationSurfaceType}
          </p>
        )}
      </fieldset>
      <Field label="Vật liệu bề mặt" htmlFor="surfaceMaterial" hint="Không bắt buộc. Ví dụ: mái tôn, bê tông." error={errors.surfaceMaterial}>
        <Input id="surfaceMaterial" value={value.surfaceMaterial} onChange={(e) => onChange({ surfaceMaterial: e.target.value })} />
      </Field>
      <Field label="Ghi chú" htmlFor="siteNote" hint="Không bắt buộc. Ví dụ: giờ vào được công trình." className="sm:col-span-2" error={errors.note}>
        <Textarea id="siteNote" rows={3} value={value.note} onChange={(e) => onChange({ note: e.target.value })} />
      </Field>
    </div>
  )
}
