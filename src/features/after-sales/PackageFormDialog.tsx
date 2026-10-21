import { useId, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { DISASTER_TYPES, SERVICE_PACKAGE_KINDS } from '@/common/afterSales'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Checkbox, Field, Input, Textarea, WithUnit } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Segmented } from '@/components/common/ui/segmented'
import { formatDurationMonths, isMaintenance, packageKindLabel } from '@/features/after-sales/afterSalesDisplay'
import {
  PACKAGE_LIMITS,
  emptyPackage,
  hasErrors,
  parseVnd,
  toPackageRequest,
  validatePackage,
  valuesFromPackage,
  type PackageErrors,
  type PackageField,
  type PackageFormValues,
} from '@/features/after-sales/packageForm'
import { useCreatePackageMutation, useUpdatePackageMutation } from '@/hooks/useAdminAfterSales'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { PackageRequest } from '@/types/req/adminAfterSalesReq'
import type { PackageView, ServicePackageKind } from '@/types/res/customerAfterSalesRes'
import { formatMoney } from '@/utils/format'

// Thêm / sửa gói dịch vụ (POST / PUT /api/admin/after-sales/packages). Loại gói chọn lúc tạo, không đổi được sau đó.
// Sửa gửi revision lúc mở form: gói vừa bị sửa ở nơi khác thì báo xung đột, không ghi đè

const KIND_OPTIONS = [SERVICE_PACKAGE_KINDS.disasterProtection, SERVICE_PACKAGE_KINDS.maintenance].map((value) => ({
  value,
  label: packageKindLabel(value),
}))

/** Thứ tự ô để đưa con trỏ tới lỗi đầu tiên */
const FIELD_ORDER: PackageField[] = [
  'name',
  'price',
  'durationMonths',
  'visitMonths',
  'coveredDisasterTypes',
  'coveragePercent',
  'perIncidentLimit',
  'termLimit',
]

function submitError(error: unknown) {
  if (isApiError(error) && error.code === 'AFTER_SALES_STALE_REVISION')
    return 'Gói vừa được sửa ở nơi khác. Đóng hộp thoại rồi mở lại để xem bản mới nhất.'
  // Câu kiểm tra của backend nói rõ ô nào sai hơn câu chung theo mã lỗi
  if (isApiError(error) && error.code === 'AFTER_SALES_VALIDATION_FAILED' && error.serverMessage)
    return 'Thông tin gói chưa hợp lệ. Kiểm tra lại các ô rồi lưu.'
  return errorMessage(error)
}

/** "= 1.500.000 ₫" để kiểm tra số vừa gõ; gõ sai dạng thì trả gợi ý mặc định */
function moneyHint(text: string, fallback: string) {
  const value = parseVnd(text)
  return value !== null && value > 0 ? `= ${formatMoney(value, 'VND')}` : fallback
}

function durationHint(text: string) {
  const months = Number(text.trim())
  return Number.isInteger(months) && months >= 12 && months % 12 === 0
    ? `= ${formatDurationMonths(months)}`
    : `Từ ${PACKAGE_LIMITS.minMonths} đến ${PACKAGE_LIMITS.maxMonths} tháng.`
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="mt-4 border-t border-line pt-4">
      <legend className="contents">
        <span className="text-body font-semibold">
          {title}
          {description && <span className="block text-meta font-normal text-fg-2">{description}</span>}
        </span>
      </legend>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">{children}</div>
    </fieldset>
  )
}

function PackageForm({
  pkg,
  kind,
  saving,
  save,
  onDone,
}: {
  pkg: PackageView | null
  kind: ServicePackageKind
  saving: boolean
  save: (body: PackageRequest) => Promise<PackageView>
  onDone: () => void
}) {
  const id = useId()
  const f = (name: string) => `${id}-${name}`
  const [values, setValues] = useState<PackageFormValues>(() => (pkg ? valuesFromPackage(pkg) : emptyPackage(kind)))
  const [revision] = useState(pkg?.revision ?? 0)
  // Báo lỗi từng ô sau lần bấm lưu đầu tiên, rồi cập nhật ngay khi gõ
  const [checked, setChecked] = useState(false)
  const [rootError, setRootError] = useState<string | null>(null)
  const errors: PackageErrors = checked ? validatePackage(values) : {}
  const maintenance = isMaintenance(values.kind)

  const set = <K extends keyof PackageFormValues>(key: K, value: PackageFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setRootError(null)
  }
  const invalid = (field: PackageField) => (errors[field] ? true : undefined)

  function toggleType(type: string, on: boolean) {
    const next = on ? [...values.coveredDisasterTypes, type] : values.coveredDisasterTypes.filter((t) => t !== type)
    set('coveredDisasterTypes', next)
  }

  async function submit() {
    if (saving) return
    setChecked(true)
    setRootError(null)
    const found = validatePackage(values)
    if (hasErrors(found)) {
      const first = FIELD_ORDER.find((field) => found[field])!
      const target = first === 'coveredDisasterTypes' ? f(`type-${Object.keys(DISASTER_TYPES)[0]}`) : f(first)
      document.getElementById(target)?.focus()
      return
    }
    try {
      const view = await save(toPackageRequest(values, revision))
      toast.success(pkg ? `Đã lưu ${view.name}` : `Đã thêm ${view.name}`)
      onDone()
    } catch (error) {
      setRootError(submitError(error))
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <DialogTitle>{pkg ? 'Sửa gói' : 'Thêm gói'}</DialogTitle>
          <p className="mt-1 text-body text-fg-2">{pkg ? packageKindLabel(pkg.kind) : 'Ô có dấu * là bắt buộc.'}</p>
        </div>
        <Button variant="secondary" icon="close" className="-mt-2" disabled={saving} onClick={onDone}>
          Đóng
        </Button>
      </div>

      {pkg && (
        <Notice tone="info" className="mt-4">
          Thay đổi chỉ áp dụng cho lần mua sau. Khách đã mua giữ nguyên giá, thời hạn và quyền lợi lúc mua.
        </Notice>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!pkg && (
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-body font-medium text-fg">Loại gói</span>
            <Segmented
              label="Loại gói"
              options={KIND_OPTIONS}
              value={values.kind}
              onChange={(value) => set('kind', value)}
              className="sm:w-fit"
            />
            <p className="text-meta text-fg-3">Không đổi được sau khi tạo.</p>
          </div>
        )}
        <Field label="Tên gói" required htmlFor={f('name')} error={errors.name} className="sm:col-span-2">
          <Input
            id={f('name')}
            value={values.name}
            maxLength={PACKAGE_LIMITS.name}
            aria-required
            aria-invalid={invalid('name')}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field
          label="Mô tả"
          htmlFor={f('description')}
          hint={`Khách đọc mô tả này khi chọn gói. ${values.description.length.toLocaleString('vi-VN')}/${PACKAGE_LIMITS.description.toLocaleString('vi-VN')} ký tự.`}
          className="sm:col-span-2"
        >
          <Textarea
            id={f('description')}
            rows={3}
            value={values.description}
            maxLength={PACKAGE_LIMITS.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
        <Field
          label="Giá"
          required
          htmlFor={f('price')}
          error={errors.price}
          hint={moneyHint(values.price, 'Số tiền nguyên, ví dụ 1.500.000.')}
        >
          <WithUnit unit="₫">
            <Input
              id={f('price')}
              inputMode="numeric"
              className="tnum"
              value={values.price}
              aria-required
              aria-invalid={invalid('price')}
              onChange={(e) => set('price', e.target.value)}
            />
          </WithUnit>
        </Field>
        <Field
          label="Thời hạn"
          required
          htmlFor={f('durationMonths')}
          error={errors.durationMonths}
          hint={durationHint(values.durationMonths)}
        >
          <WithUnit unit="tháng">
            <Input
              id={f('durationMonths')}
              inputMode="numeric"
              className="tnum"
              value={values.durationMonths}
              aria-required
              aria-invalid={invalid('durationMonths')}
              onChange={(e) => set('durationMonths', e.target.value)}
            />
          </WithUnit>
        </Field>
      </div>

      {maintenance ? (
        <Section title="Lượt bảo trì">
          <Field
            label="Tháng có lượt bảo trì"
            required
            htmlFor={f('visitMonths')}
            error={errors.visitMonths}
            hint="Tính từ khi gói bắt đầu, cách nhau bằng dấu phẩy. Ví dụ 6, 12 là hai lượt, ở tháng thứ 6 và 12."
            className="sm:col-span-3"
          >
            <Input
              id={f('visitMonths')}
              className="tnum sm:w-64"
              value={values.visitMonths}
              aria-required
              aria-invalid={invalid('visitMonths')}
              onChange={(e) => set('visitMonths', e.target.value)}
            />
          </Field>
        </Section>
      ) : (
        <Section title="Quyền lợi" description="Hỗ trợ chi phí sửa chữa khi công trình hư hỏng do thiên tai.">
          <fieldset className="flex flex-col gap-2 sm:col-span-3">
            <legend className="mb-2 text-body font-medium text-fg">
              Thiên tai được bảo vệ
              <span aria-hidden className="text-danger">
                {' *'}
              </span>
            </legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {Object.entries(DISASTER_TYPES).map(([type, label]) => (
                <Checkbox
                  key={type}
                  id={f(`type-${type}`)}
                  label={label}
                  checked={values.coveredDisasterTypes.includes(type)}
                  onChange={(e) => toggleType(type, e.target.checked)}
                />
              ))}
            </div>
            {errors.coveredDisasterTypes && (
              <p className="text-meta text-danger" role="alert">
                {errors.coveredDisasterTypes}
              </p>
            )}
          </fieldset>
          <Field
            label="Tỷ lệ hỗ trợ"
            required
            htmlFor={f('coveragePercent')}
            error={errors.coveragePercent}
            hint="Phần trăm chi phí sửa chữa được duyệt."
          >
            <WithUnit unit="%">
              <Input
                id={f('coveragePercent')}
                inputMode="decimal"
                className="tnum"
                value={values.coveragePercent}
                aria-required
                aria-invalid={invalid('coveragePercent')}
                onChange={(e) => set('coveragePercent', e.target.value)}
              />
            </WithUnit>
          </Field>
          <Field
            label="Hạn mức mỗi sự cố"
            required
            htmlFor={f('perIncidentLimit')}
            error={errors.perIncidentLimit}
            hint={moneyHint(values.perIncidentLimit, 'Số tiền hỗ trợ tối đa cho một sự cố.')}
          >
            <WithUnit unit="₫">
              <Input
                id={f('perIncidentLimit')}
                inputMode="numeric"
                className="tnum"
                value={values.perIncidentLimit}
                aria-required
                aria-invalid={invalid('perIncidentLimit')}
                onChange={(e) => set('perIncidentLimit', e.target.value)}
              />
            </WithUnit>
          </Field>
          <Field
            label="Hạn mức mỗi kỳ"
            required
            htmlFor={f('termLimit')}
            error={errors.termLimit}
            hint={moneyHint(values.termLimit, 'Tổng hỗ trợ tối đa trong một kỳ gói.')}
          >
            <WithUnit unit="₫">
              <Input
                id={f('termLimit')}
                inputMode="numeric"
                className="tnum"
                value={values.termLimit}
                aria-required
                aria-invalid={invalid('termLimit')}
                onChange={(e) => set('termLimit', e.target.value)}
              />
            </WithUnit>
          </Field>
        </Section>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <Checkbox
          label="Đang bán"
          description="Bỏ chọn thì khách không thấy và không mua được gói này. Gói khách đã mua không bị ảnh hưởng."
          checked={values.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
        />
      </div>

      {rootError && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{rootError}</Notice>
        </div>
      )}

      <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 border-t border-line bg-canvas px-6 py-4">
        {checked && hasErrors(errors) && (
          <p className="mr-auto flex items-center gap-1.5 text-body text-danger">
            <Icon name="error" className="shrink-0 text-[20px]" />
            Còn ô chưa hợp lệ.
          </p>
        )}
        <Button icon="close" variant="secondary" disabled={saving} onClick={onDone}>
          Huỷ
        </Button>
        <Button icon="save" type="submit" variant="primary" disabled={saving}>
          {saving ? 'Đang lưu…' : pkg ? 'Lưu thay đổi' : 'Thêm gói'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** `pkg` có thì là sửa; `kind` là loại mặc định khi thêm mới (theo tab đang xem) */
export function PackageFormDialog({
  open,
  pkg,
  kind,
  onOpenChange,
}: {
  open: boolean
  pkg: PackageView | null
  kind: ServicePackageKind
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreatePackageMutation()
  const update = useUpdatePackageMutation()
  const saving = create.isPending || update.isPending
  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!saving}
      aria-label={pkg ? 'Sửa gói' : 'Thêm gói'}
      className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto"
    >
      {/* Chỉ vẽ form khi mở để mỗi lần mở là một form mới */}
      {open && (
        <PackageForm
          pkg={pkg}
          kind={kind}
          saving={saving}
          save={(body) => (pkg ? update.mutateAsync({ id: pkg.packageId, body }) : create.mutateAsync(body))}
          onDone={() => onOpenChange(false)}
        />
      )}
    </ModalDialog>
  )
}
