import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useState } from 'react'
import { useFieldArray, useForm, type Path } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { Field, Input, Select } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { useCreateProductMutation, useUpdateProductMutation } from '@/hooks/useProducts'
import {
  INVERTER_PHASES,
  INVERTER_SPEC_FIELDS,
  PRODUCT_TYPES,
  SOLAR_PANEL_TYPE,
  type InverterNumberKey,
} from '@/common/product'
import { isInverterType, isSolarPanelType, specEntries } from '@/features/products/productDisplay'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { UpdateProductRequest } from '@/types/req/adminProductsReq'
import type { ProductResponse } from '@/types/res/adminProductsRes'

// Form thêm / sửa sản phẩm (POST và PUT /api/admin/products), luật kiểm tra theo backend
// SOLAR_PANEL bắt buộc thêm ratedPowerW, widthMm, heightMm vì mô phỏng cần. Thông số inverter nằm trong `spec`
// nhưng có ô riêng vì backend cần đúng kiểu số. Thêm mới gửi ACTIVE; PUT không nhận status và không đụng tới ảnh
// (ảnh sửa ở trang chi tiết), nên link ảnh chỉ có khi thêm mới

const required = (label: string) => z.string().trim().min(1, `Vui lòng nhập ${label}`)

/** Ô số để trống được; có nhập thì phải là số thoả điều kiện. */
const optionalNumber = (label: string, { allowZero }: { allowZero: boolean }) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || Number.isFinite(Number(v)), `${label} phải là số`)
    .refine(
      (v) => v === '' || (allowZero ? Number(v) >= 0 : Number(v) > 0),
      `${label} phải ${allowZero ? 'từ 0 trở lên' : 'lớn hơn 0'}`,
    )

/** Ô thông số inverter: để trống được; có nhập thì là số dương, MPPT là số nguyên, hiệu suất tối đa 100 */
function inverterNumber(key: InverterNumberKey) {
  const field = INVERTER_SPEC_FIELDS.find((f) => f.key === key)!
  return optionalNumber(field.label, { allowZero: false })
    .refine((v) => v === '' || !field.integer || Number.isInteger(Number(v)), `${field.label} phải là số nguyên`)
    .refine((v) => v === '' || field.max == null || Number(v) <= field.max, `${field.label} tối đa ${field.max}`)
}

const INVERTER_KEYS = new Set<string>([...INVERTER_SPEC_FIELDS.map((f) => f.key), 'phase'])

/** Link ảnh như backend nhận: https tuyệt đối, tối đa 1000 ký tự */
function isImageUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:' && value.length <= 1000
  } catch {
    return false
  }
}

const productFormSchema = z
  .object({
    sku: required('SKU'),
    name: required('tên sản phẩm'),
    productType: required('loại sản phẩm'),
    category: z.string().trim(),
    brand: required('hãng'),
    model: z.string().trim(),
    unit: required('đơn vị tính'),
    unitPrice: required('đơn giá').refine(
      (v) => Number.isFinite(Number(v)) && Number(v) >= 0,
      'Đơn giá phải là số từ 0 trở lên',
    ),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, 'Mã tiền tệ gồm đúng 3 chữ cái, ví dụ VND'),
    ratedPowerW: optionalNumber('Công suất', { allowZero: false }),
    widthMm: optionalNumber('Chiều rộng', { allowZero: false }),
    heightMm: optionalNumber('Chiều cao', { allowZero: false }),
    warrantyMonth: optionalNumber('Số tháng bảo hành', { allowZero: true }).refine(
      (v) => v === '' || Number.isInteger(Number(v)),
      'Số tháng bảo hành phải là số nguyên',
    ),
    imageUrl: z
      .string()
      .trim()
      .refine((v) => v === '' || isImageUrl(v), 'Link ảnh phải bắt đầu bằng https:// và hợp lệ'),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    spec: z.array(z.object({ key: z.string().trim(), value: z.string().trim() })),
    inverter: z.object({
      ratedAcPowerW: inverterNumber('ratedAcPowerW'),
      maxDcInputPowerW: inverterNumber('maxDcInputPowerW'),
      maxDcVoltageV: inverterNumber('maxDcVoltageV'),
      mpptCount: inverterNumber('mpptCount'),
      efficiencyPercent: inverterNumber('efficiencyPercent'),
      phase: z.enum(['', 'SINGLE_PHASE', 'THREE_PHASE']),
    }),
  })
  .superRefine((values, ctx) => {
    if (isSolarPanelType(values.productType)) {
      if (!values.ratedPowerW)
        ctx.addIssue({ code: 'custom', path: ['ratedPowerW'], message: 'Tấm pin cần công suất định mức' })
      if (!values.widthMm) ctx.addIssue({ code: 'custom', path: ['widthMm'], message: 'Tấm pin cần chiều rộng' })
      if (!values.heightMm) ctx.addIssue({ code: 'custom', path: ['heightMm'], message: 'Tấm pin cần chiều cao' })
    }
    const seen = new Set<string>()
    values.spec.forEach((row, i) => {
      if (!row.key && row.value)
        ctx.addIssue({ code: 'custom', path: ['spec', i, 'key'], message: 'Nhập tên thông số' })
      if (row.key && seen.has(row.key))
        ctx.addIssue({ code: 'custom', path: ['spec', i, 'key'], message: 'Thông số bị trùng' })
      // Khoá của thông số inverter đã có ô riêng
      if (INVERTER_KEYS.has(row.key))
        ctx.addIssue({ code: 'custom', path: ['spec', i, 'key'], message: 'Nhập ở phần thông số inverter' })
      seen.add(row.key)
    })
  })

type ProductFormValues = z.infer<typeof productFormSchema>

const emptyValues: ProductFormValues = {
  sku: '',
  name: '',
  productType: '',
  category: '',
  brand: '',
  model: '',
  unit: '',
  unitPrice: '',
  currency: 'VND',
  ratedPowerW: '',
  widthMm: '',
  heightMm: '',
  warrantyMonth: '',
  imageUrl: '',
  status: 'ACTIVE',
  spec: [],
  inverter: {
    ratedAcPowerW: '',
    maxDcInputPowerW: '',
    maxDcVoltageV: '',
    mpptCount: '',
    efficiencyPercent: '',
    phase: '',
  },
}

const text = (value: unknown) => (value == null ? '' : String(value))

/** `spec` dạng object (backend có thể trả chuỗi JSON) */
function specObject(spec: unknown): Record<string, unknown> {
  if (typeof spec === 'string') {
    try {
      return specObject(JSON.parse(spec) as unknown)
    } catch {
      return {}
    }
  }
  return spec && typeof spec === 'object' && !Array.isArray(spec) ? (spec as Record<string, unknown>) : {}
}

function inverterFromSpec(spec: unknown): ProductFormValues['inverter'] {
  const values = specObject(spec)
  const phase = INVERTER_PHASES.find((p) => p.value === values.phase)?.value ?? ''
  return {
    ratedAcPowerW: text(values.ratedAcPowerW),
    maxDcInputPowerW: text(values.maxDcInputPowerW),
    maxDcVoltageV: text(values.maxDcVoltageV),
    mpptCount: text(values.mpptCount),
    efficiencyPercent: text(values.efficiencyPercent),
    phase,
  }
}

function valuesFromProduct(product: ProductResponse): ProductFormValues {
  return {
    sku: text(product.sku),
    name: text(product.name),
    productType: text(product.productType),
    category: text(product.category),
    brand: text(product.brand),
    model: text(product.model),
    unit: text(product.unit),
    unitPrice: text(product.unitPrice),
    currency: text(product.currency) || 'VND',
    ratedPowerW: text(product.ratedPowerW),
    widthMm: text(product.widthMm),
    heightMm: text(product.heightMm),
    warrantyMonth: text(product.warrantyMonth),
    imageUrl: '',
    status: product.status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    spec: specEntries(product.spec)
      .filter(({ key }) => !INVERTER_KEYS.has(key))
      .map(({ key, value }) => ({ key, value })),
    inverter: inverterFromSpec(product.spec),
  }
}

const orNull = (value: string) => (value === '' ? null : value)
const numberOrNull = (value: string) => (value === '' ? null : Number(value))

/** Giá trị là object / mảng JSON (vd. khối installation) thì giữ nguyên dạng, còn lại là chữ */
function specValue(value: string): unknown {
  if (/^[[{]/.test(value)) {
    try {
      return JSON.parse(value) as unknown
    } catch {
      // Không phải JSON: gửi như chữ
    }
  }
  return value
}

/** Dòng thông số tự do cộng thông số inverter (số gửi đúng kiểu số) */
function specFromValues(values: ProductFormValues) {
  const spec: Record<string, unknown> = {}
  for (const row of values.spec) if (row.key) spec[row.key] = specValue(row.value)
  for (const field of INVERTER_SPEC_FIELDS) {
    const value = values.inverter[field.key]
    if (value !== '') spec[field.key] = Number(value)
  }
  if (values.inverter.phase) spec.phase = values.inverter.phase
  return Object.keys(spec).length ? spec : null
}

/** Body chung của POST và PUT; status và ảnh chỉ POST nhận nên thêm riêng ở chỗ tạo mới. */
function toRequest(values: ProductFormValues): UpdateProductRequest {
  return {
    sku: values.sku,
    name: values.name,
    productType: values.productType,
    category: orNull(values.category),
    brand: values.brand,
    model: orNull(values.model),
    unit: values.unit,
    unitPrice: Number(values.unitPrice),
    currency: values.currency.toUpperCase(),
    ratedPowerW: numberOrNull(values.ratedPowerW),
    widthMm: numberOrNull(values.widthMm),
    heightMm: numberOrNull(values.heightMm),
    warrantyMonth: numberOrNull(values.warrantyMonth),
    spec: specFromValues(values),
  }
}

/** Thông số không đổi so với lúc mở form (bỏ khoảng trắng hai đầu như zod đã làm). */
function sameSpec(values: ProductFormValues, original: ProductFormValues) {
  const norm = (v: ProductFormValues) =>
    JSON.stringify([
      v.spec.map((r) => [r.key.trim(), r.value.trim()]),
      Object.values(v.inverter).map((value) => value.trim()),
    ])
  return norm(values) === norm(original)
}

/**
 * Backend trả lỗi theo tên PascalCase ("UnitPrice"); form dùng camelCase. Lỗi ảnh ("Images[0].Url") về ô link ảnh,
 * lỗi thông số inverter ("'spec.mpptCount' must…") về đúng ô của nó.
 */
const FORM_FIELDS = new Set(Object.keys(emptyValues))
function toFormField(serverField: string, message: string): Path<ProductFormValues> | null {
  if (serverField === 'ImageUrl' || serverField.startsWith('Images')) return 'imageUrl'
  if (serverField === 'Spec') {
    const key = /'spec\.(\w+)'/.exec(message)?.[1]
    return key && INVERTER_KEYS.has(key) ? (`inverter.${key}` as Path<ProductFormValues>) : null
  }
  const name = serverField.charAt(0).toLowerCase() + serverField.slice(1)
  return FORM_FIELDS.has(name) && name !== 'spec' && name !== 'inverter' ? (name as Path<ProductFormValues>) : null
}

export type ProductFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có thì là sửa, không có là thêm mới */
  product?: ProductResponse | null
  /** Gợi ý cho ô loại / nhóm, lấy từ các sản phẩm đã có */
  suggestions?: { productTypes: string[]; categories: string[] }
}

function ProductForm({
  product,
  suggestions,
  onDone,
  onBusyChange,
}: Pick<ProductFormDialogProps, 'product' | 'suggestions'> & {
  onDone: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const id = useId()
  const isEdit = Boolean(product?.id)
  const createMutation = useCreateProductMutation()
  const updateMutation = useUpdateProductMutation()
  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? valuesFromProduct(product) : emptyValues,
  })
  const spec = useFieldArray({ control, name: 'spec' })

  // Đang lưu thì không cho đóng dialog
  useEffect(() => {
    onBusyChange(isSubmitting)
    return () => onBusyChange(false)
  }, [isSubmitting, onBusyChange])

  const onSubmit = async (values: ProductFormValues) => {
    const body = toRequest(values)
    // Không sửa thông số thì gửi lại spec cũ, tránh số và true/false bị đổi thành chuỗi
    if (product && sameSpec(values, valuesFromProduct(product))) body.spec = product.spec ?? null
    try {
      if (isEdit && product?.id) {
        await updateMutation.mutateAsync({ id: product.id, body })
        toast.success(`Đã lưu ${values.name}`)
      } else {
        // Link ảnh thành ảnh chính đầu tiên; thêm ảnh khác ở trang chi tiết
        const images = values.imageUrl ? [{ url: values.imageUrl, altText: null }] : null
        await createMutation.mutateAsync({ ...body, status: 'ACTIVE', images })
        toast.success(`Đã thêm ${values.name}`)
      }
      onDone()
    } catch (error) {
      let mapped = false
      if (isApiError(error)) {
        for (const [serverField, message] of Object.entries(error.fieldErrors)) {
          const field = toFormField(serverField, message)
          if (field) {
            // Câu lỗi về thông số của backend là tiếng Anh, chỉ cần chỉ đúng ô
            setError(field, {
              type: 'server',
              message: serverField === 'Spec' ? 'Giá trị không hợp lệ' : message,
            })
            mapped = true
          }
        }
      }
      setError('root', {
        type: 'server',
        message: mapped ? 'Một số ô chưa hợp lệ, xem thông báo ở từng ô.' : errorMessage(error),
      })
    }
  }

  const f = (name: string) => `${id}-${name}`
  const isPanel = isSolarPanelType(watch('productType'))
  // Sản phẩm loại khác mà spec có sẵn thông số inverter thì vẫn hiện để không bị ẩn mất
  const showInverter = isInverterType(watch('productType')) || Object.values(watch('inverter')).some(Boolean)
  const invalid = (name: keyof ProductFormValues) => (errors[name] ? true : undefined)
  const typeSuggestions = [
    ...PRODUCT_TYPES,
    ...(suggestions?.productTypes ?? [])
      .filter((value) => !PRODUCT_TYPES.some((t) => t.value === value))
      .map((value) => ({ value, label: value })),
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Trên điện thoại hàng nút dính đáy để không phải cuộn hết form */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <DialogTitle>{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle>
          <p className="mt-1 text-body text-fg-2">
            {isEdit ? <span className="tnum">{product?.sku}</span> : 'Ô có dấu * là bắt buộc.'}
          </p>
        </div>
        <Button variant="secondary" icon="close" className="-mt-2" disabled={isSubmitting} onClick={onDone}>
          Đóng
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tên sản phẩm" required htmlFor={f('name')} error={errors.name?.message} className="sm:col-span-2">
          <Input id={f('name')} aria-required aria-invalid={invalid('name')} {...register('name')} />
        </Field>
        <Field label="SKU" required htmlFor={f('sku')} error={errors.sku?.message}>
          <Input id={f('sku')} aria-required aria-invalid={invalid('sku')} {...register('sku')} />
        </Field>
        <Field label="Hãng" required htmlFor={f('brand')} error={errors.brand?.message}>
          <Input id={f('brand')} aria-required aria-invalid={invalid('brand')} {...register('brand')} />
        </Field>
        <Field label="Loại sản phẩm" required htmlFor={f('productType')} error={errors.productType?.message}>
          <Input
            id={f('productType')}
            list={f('types')}
            aria-required
            aria-invalid={invalid('productType')}
            {...register('productType')}
          />
        </Field>
        <Field label="Nhóm hàng" htmlFor={f('category')} error={errors.category?.message}>
          <Input
            id={f('category')}
            list={f('categories')}
            aria-invalid={invalid('category')}
            {...register('category')}
          />
        </Field>
        <Field label="Model" htmlFor={f('model')} error={errors.model?.message}>
          <Input id={f('model')} aria-invalid={invalid('model')} {...register('model')} />
        </Field>
        <Field label="Đơn vị tính" required htmlFor={f('unit')} error={errors.unit?.message} hint="Ví dụ: tấm, bộ, cái">
          <Input id={f('unit')} aria-required aria-invalid={invalid('unit')} {...register('unit')} />
        </Field>
        <Field label="Đơn giá" required htmlFor={f('unitPrice')} error={errors.unitPrice?.message}>
          <Input
            id={f('unitPrice')}
            inputMode="decimal"
            aria-required
            aria-invalid={invalid('unitPrice')}
            {...register('unitPrice')}
          />
        </Field>
        <Field label="Tiền tệ" required htmlFor={f('currency')} error={errors.currency?.message}>
          <Input
            id={f('currency')}
            maxLength={3}
            className="uppercase"
            aria-required
            aria-invalid={invalid('currency')}
            {...register('currency')}
          />
        </Field>
        <Field label="Bảo hành (tháng)" htmlFor={f('warrantyMonth')} error={errors.warrantyMonth?.message}>
          <Input
            id={f('warrantyMonth')}
            inputMode="numeric"
            aria-invalid={invalid('warrantyMonth')}
            {...register('warrantyMonth')}
          />
        </Field>

        {/* Bắt buộc với tấm pin vì mô phỏng cần ba số này */}
        <fieldset className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:col-span-2 sm:grid-cols-3">
          <legend className="contents">
            <span className="text-body font-semibold sm:col-span-3">
              Công suất và kích thước
              <span className="block text-meta font-normal text-fg-2">
                {isPanel
                  ? 'Bắt buộc với tấm pin, dùng cho mô phỏng bố trí.'
                  : `Bắt buộc khi loại là ${SOLAR_PANEL_TYPE}.`}
              </span>
            </span>
          </legend>
          <Field
            label="Công suất định mức (W)"
            required={isPanel}
            htmlFor={f('ratedPowerW')}
            error={errors.ratedPowerW?.message}
          >
            <Input
              id={f('ratedPowerW')}
              inputMode="decimal"
              aria-required={isPanel}
              aria-invalid={invalid('ratedPowerW')}
              {...register('ratedPowerW')}
            />
          </Field>
          <Field label="Chiều rộng (mm)" required={isPanel} htmlFor={f('widthMm')} error={errors.widthMm?.message}>
            <Input
              id={f('widthMm')}
              inputMode="decimal"
              aria-required={isPanel}
              aria-invalid={invalid('widthMm')}
              {...register('widthMm')}
            />
          </Field>
          <Field label="Chiều cao (mm)" required={isPanel} htmlFor={f('heightMm')} error={errors.heightMm?.message}>
            <Input
              id={f('heightMm')}
              inputMode="decimal"
              aria-required={isPanel}
              aria-invalid={invalid('heightMm')}
              {...register('heightMm')}
            />
          </Field>
        </fieldset>

        {showInverter && (
          <fieldset className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:col-span-2 sm:grid-cols-3">
            <legend className="contents">
              <span className="text-body font-semibold sm:col-span-3">Thông số inverter</span>
            </legend>
            {INVERTER_SPEC_FIELDS.map((field) => (
              <Field
                key={field.key}
                label={field.unit ? `${field.label} (${field.unit})` : field.label}
                htmlFor={f(field.key)}
                error={errors.inverter?.[field.key]?.message}
              >
                <Input
                  id={f(field.key)}
                  inputMode={field.integer ? 'numeric' : 'decimal'}
                  aria-invalid={errors.inverter?.[field.key] ? true : undefined}
                  {...register(`inverter.${field.key}`)}
                />
              </Field>
            ))}
            <Field label="Số pha" htmlFor={f('phase')} error={errors.inverter?.phase?.message}>
              <Select id={f('phase')} {...register('inverter.phase')}>
                <option value="">Chưa chọn</option>
                {INVERTER_PHASES.map((phase) => (
                  <option key={phase.value} value={phase.value}>
                    {phase.label}
                  </option>
                ))}
              </Select>
            </Field>
          </fieldset>
        )}

        {!isEdit && (
          <Field
            label="Link ảnh chính"
            htmlFor={f('imageUrl')}
            error={errors.imageUrl?.message}
            className="sm:col-span-2"
          >
            <Input
              id={f('imageUrl')}
              type="url"
              placeholder="https://"
              aria-invalid={invalid('imageUrl')}
              {...register('imageUrl')}
            />
          </Field>
        )}
      </div>

      <fieldset className="mt-4 border-t border-line pt-4">
        <legend className="contents">
          <span className="text-body font-semibold">Thông số kỹ thuật</span>
        </legend>
        {spec.fields.length === 0 && <p className="mt-2 text-meta text-fg-3">Chưa có thông số nào.</p>}
        <div className="mt-2 space-y-2">
          {spec.fields.map((row, i) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
              <div>
                <label htmlFor={f(`spec-${i}-key`)} className="sr-only">
                  Tên thông số {i + 1}
                </label>
                <Input
                  id={f(`spec-${i}-key`)}
                  placeholder="Ví dụ: Hiệu suất"
                  aria-invalid={errors.spec?.[i]?.key ? true : undefined}
                  {...register(`spec.${i}.key`)}
                />
                {errors.spec?.[i]?.key?.message && (
                  <p role="alert" className="mt-1 text-meta text-danger">
                    {errors.spec[i].key.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor={f(`spec-${i}-value`)} className="sr-only">
                  Giá trị thông số {i + 1}
                </label>
                <Input id={f(`spec-${i}-value`)} placeholder="Ví dụ: 21,8%" {...register(`spec.${i}.value`)} />
              </div>
              <Button variant="danger" icon="close" aria-label={`Bỏ thông số ${i + 1}`} onClick={() => spec.remove(i)}>
                Bỏ
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="soft"
          size="sm"
          icon="add"
          className="mt-2"
          onClick={() => spec.append({ key: '', value: '' })}
        >
          Thêm thông số
        </Button>
      </fieldset>

      <datalist id={f('types')}>
        {typeSuggestions.map((type) => (
          <option key={type.value} value={type.value} label={type.label} />
        ))}
      </datalist>
      <datalist id={f('categories')}>
        {suggestions?.categories.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>

      {errors.root?.message && (
        <div role="alert" className="mt-4">
          <Notice tone="danger">{errors.root.message}</Notice>
        </div>
      )}

      <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 border-t border-line bg-canvas px-6 py-4">
        <Button icon="close" variant="secondary" disabled={isSubmitting} onClick={onDone}>
          Huỷ
        </Button>
        <Button icon="save" type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/* Dialog rộng hơn mặc định vì form có hai cột; cao quá màn hình thì cuộn bên trong dialog. */
export function ProductFormDialog({ open, onOpenChange, product, suggestions }: ProductFormDialogProps) {
  const [busy, setBusy] = useState(false)
  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!busy}
      aria-label={product?.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto"
    >
      {/* key: mở lại dialog cho sản phẩm khác thì form khởi tạo lại từ đầu */}
      <ProductForm
        key={product?.id ?? 'new'}
        product={product}
        suggestions={suggestions}
        onDone={() => onOpenChange(false)}
        onBusyChange={setBusy}
      />
    </ModalDialog>
  )
}
