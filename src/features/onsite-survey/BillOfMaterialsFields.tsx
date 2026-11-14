import { useMemo } from 'react'
import { Button, IconButton } from '@/components/common/ui/button'
import { Field, Input, Select, Textarea, WithUnit, fieldMessageId } from '@/components/common/ui/field'
import {
  BOM_ERROR_KEY,
  BOM_LIMITS,
  bomErrorKey,
  bomGaps,
  isServiceType,
  newBomRow,
  type BomList,
  type BomRow,
} from '@/features/onsite-survey/billOfMaterials'
import type { OnSiteSurveyErrors, OnSiteSurveyForm } from '@/features/onsite-survey/onSiteSurveyForm'
import { isProductActive } from '@/features/products/productDisplay'
import { useCatalogPickerQuery } from '@/hooks/useProducts'
import { errorMessage } from '@/services/api/errors'
import type { ProductResponse } from '@/types/res/adminProductsRes'

const productLabel = (p: ProductResponse) => (p.sku ? `${p.name} (${p.sku})` : (p.name ?? ''))

// Thiết bị và dịch vụ kỹ thuật viên chốt tại công trình. Chỉ chọn sản phẩm trong danh mục, không có giá: báo giá tự lập
// lấy giá từ danh mục
export function BillOfMaterialsFields({
  value,
  errors,
  onChange,
  disabled,
}: {
  value: OnSiteSurveyForm
  errors: OnSiteSurveyErrors
  onChange: (patch: Partial<OnSiteSurveyForm>) => void
  disabled?: boolean
}) {
  const catalog = useCatalogPickerQuery()
  const byId = useMemo(() => {
    const map = new Map<string, ProductResponse>()
    for (const p of catalog.data?.items ?? []) if (p.id && p.name && isProductActive(p.status)) map.set(p.id, p)
    return map
  }, [catalog.data])
  const products = [...byId.values()]
  const equipment = products.filter((p) => !isServiceType(p.productType))
  const services = products.filter((p) => isServiceType(p.productType))
  const gaps = catalog.data ? bomGaps(value.materials, value.serviceItems, (id) => byId.get(id)?.productType) : []
  const total = value.materials.length + value.serviceItems.length

  return (
    <>
      {catalog.isError && <p className="text-meta text-danger">{errorMessage(catalog.error)}</p>}
      {gaps.length > 0 && <p className="text-meta text-fg-2">Báo giá tự lập cần thêm: {gaps.join(', ')}.</p>}
      <BomRows
        list="materials"
        title="Thiết bị"
        addLabel="Thêm thiết bị"
        rows={value.materials}
        options={equipment}
        byId={byId}
        errors={errors}
        loading={catalog.isPending}
        canAdd={total < BOM_LIMITS.maxItems}
        disabled={disabled}
        onChange={(materials) => onChange({ materials })}
      />
      <BomRows
        list="serviceItems"
        title="Dịch vụ"
        addLabel="Thêm dịch vụ"
        rows={value.serviceItems}
        options={services}
        byId={byId}
        errors={errors}
        loading={catalog.isPending}
        canAdd={total < BOM_LIMITS.maxItems}
        disabled={disabled}
        onChange={(serviceItems) => onChange({ serviceItems })}
      />
      <Field label="Ghi chú lắp đặt" htmlFor="os-installationNotes" optional error={errors[BOM_ERROR_KEY]}>
        <Textarea
          id="os-installationNotes"
          rows={2}
          maxLength={BOM_LIMITS.notesLength}
          disabled={disabled}
          value={value.installationNotes}
          onChange={(e) => onChange({ installationNotes: e.target.value })}
          aria-invalid={Boolean(errors[BOM_ERROR_KEY])}
          aria-describedby={fieldMessageId('os-installationNotes')}
        />
      </Field>
    </>
  )
}

function BomRows({
  list,
  title,
  addLabel,
  rows,
  options,
  byId,
  errors,
  loading,
  canAdd,
  disabled,
  onChange,
}: {
  list: BomList
  title: string
  addLabel: string
  rows: BomRow[]
  options: ProductResponse[]
  byId: Map<string, ProductResponse>
  errors: OnSiteSurveyErrors
  loading: boolean
  canAdd: boolean
  disabled?: boolean
  onChange: (rows: BomRow[]) => void
}) {
  const update = (index: number, patch: Partial<BomRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  return (
    <div className="space-y-3">
      <h4 className="text-body font-medium text-fg">
        {title} ({rows.length})
      </h4>
      {rows.length === 0 && <p className="text-body text-fg-2">Chưa ghi {title.toLowerCase()} nào.</p>}
      {rows.map((row, i) => {
        const id = `os-bom-${row.key}`
        const error = errors[bomErrorKey(list, i)]
        const product = byId.get(row.productId)
        return (
          <div key={row.key} className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
            <Field
              label={`${title} ${i + 1}`}
              htmlFor={`${id}-product`}
              hint={loading ? 'Đang tải danh mục…' : undefined}
            >
              <Select
                id={`${id}-product`}
                disabled={disabled || loading}
                value={row.productId}
                onChange={(e) => update(i, { productId: e.target.value })}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : fieldMessageId(`${id}-product`)}
              >
                <option value="">Chọn sản phẩm</option>
                {row.productId && !product && !loading && (
                  <option value={row.productId}>Sản phẩm không còn trong danh mục</option>
                )}
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {productLabel(p)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Số lượng" htmlFor={`${id}-quantity`}>
              <WithUnit unit={product?.unit ?? ''}>
                <Input
                  id={`${id}-quantity`}
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={disabled}
                  value={row.quantity}
                  onChange={(e) => update(i, { quantity: e.target.value })}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                />
              </WithUnit>
            </Field>
            <IconButton
              icon="delete"
              label={`Xoá ${title.toLowerCase()} ${i + 1}`}
              variant="danger-quiet"
              className="sm:mt-7"
              disabled={disabled}
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            />
            {/* Một lỗi cho cả dòng vì backend báo lỗi theo dòng, không theo ô */}
            {error && (
              <p id={`${id}-error`} role="alert" className="-mt-1 text-meta text-danger sm:col-span-3">
                {error}
              </p>
            )}
          </div>
        )
      })}
      {canAdd && (
        <Button
          variant="soft"
          size="sm"
          icon="add"
          disabled={disabled}
          onClick={() => onChange([...rows, newBomRow()])}
        >
          {addLabel}
        </Button>
      )}
    </div>
  )
}
