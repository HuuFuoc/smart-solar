import type { ReactNode } from 'react'
import { ASSET_TYPES } from '@/common/installation'
import { IconButton } from '@/components/common/ui/button'
import { Input, Select } from '@/components/common/ui/field'
import {
  ASSET_LIMITS,
  MANUAL_PRODUCT_VALUE,
  assetFieldId,
  changeAssetType,
  filterProductsForAssetType,
  formatProductOptionLabel,
  requiresCatalogProduct,
  selectAssetProduct,
  type AssetField,
  type AssetRow,
  type AssetRowErrors,
} from '@/features/installations/assetForm'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import type { EquipmentDifference } from '@/types/res/customerInstallationsRes'
import { cx } from '@/utils/cx'

const ariaInvalid = (row: AssetRow, field: AssetField, errors: AssetRowErrors) =>
  errors[field] ? { 'aria-invalid': true as const, 'aria-describedby': `${assetFieldId(row, field)}-error` } : {}

function Cell({
  row,
  field,
  label,
  error,
  className,
  children,
}: {
  row: AssetRow
  field: AssetField
  label: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={assetFieldId(row, field)} className="text-meta text-fg-2 xl:sr-only">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${assetFieldId(row, field)}-error`} className="text-meta text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function SubTextInput({
  row,
  field,
  label,
  errors,
  onChange,
}: {
  row: AssetRow
  field: 'manufacturer' | 'model'
  label: string
  errors: AssetRowErrors
  onChange: (value: string) => void
}) {
  const id = assetFieldId(row, field)
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-meta text-fg-2">
        {label} *
      </label>
      <Input
        id={id}
        size="sm"
        value={row[field]}
        maxLength={ASSET_LIMITS.text}
        autoComplete="off"
        aria-required
        onChange={(e) => onChange(e.target.value)}
        {...ariaInvalid(row, field, errors)}
      />
      {errors[field] && (
        <p id={`${id}-error`} className="text-meta text-danger" role="alert">
          {errors[field]}
        </p>
      )}
    </div>
  )
}

function emptyOptionText(assetType: string, isPending: boolean, hasOptions: boolean) {
  if (isPending) return 'Đang tải danh sách sản phẩm…'
  if (assetType === 'PANEL') return hasOptions ? 'Chọn tấm pin có sẵn…' : 'Chưa có tấm pin nào trong danh mục'
  return hasOptions ? 'Chọn inverter có sẵn…' : 'Chưa có inverter nào trong danh mục'
}

export function AssetEntryRow({
  row,
  index,
  canRemove,
  className,
  errors,
  products,
  differences,
  diffByProduct,
  catalogPending,
  onChangeRow,
  onRemove,
}: {
  row: AssetRow
  index: number
  canRemove: boolean
  className?: string
  errors: AssetRowErrors
  products: readonly ProductResponse[]
  differences: readonly EquipmentDifference[]
  diffByProduct: ReadonlyMap<string, EquipmentDifference>
  catalogPending: boolean
  onChangeRow: (transform: (row: AssetRow) => AssetRow) => void
  onRemove: () => void
}) {
  const catalogRequired = requiresCatalogProduct(row.assetType)
  const options = filterProductsForAssetType(products, row.assetType, differences)
  const manualMode = !catalogRequired && !row.productId
  const needsBrand = manualMode || (Boolean(row.productId) && !row.manufacturer.trim())
  const needsModel = manualMode || (Boolean(row.productId) && !row.model.trim())

  return (
    <li
      aria-label={`Thiết bị ${index + 1}`}
      className={cx(
        'grid grid-cols-2 gap-3 max-xl:rounded-container max-xl:border max-xl:border-line max-xl:p-4 xl:items-start',
        className,
      )}
    >
      <span className="tnum col-span-2 text-body font-semibold xl:col-span-1 xl:pt-2.5 xl:font-normal xl:text-fg-2">
        <span className="xl:hidden">Thiết bị </span>
        {index + 1}
      </span>
      <Cell row={row} field="assetType" label="Loại" error={errors.assetType} className="col-span-2 xl:col-span-1">
        <Select
          id={assetFieldId(row, 'assetType')}
          value={row.assetType}
          onChange={(e) => onChangeRow((r) => changeAssetType(r, e.target.value, products))}
          {...ariaInvalid(row, 'assetType', errors)}
        >
          {Object.entries(ASSET_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Cell>
      <Cell
        row={row}
        field="productId"
        label="Sản phẩm có sẵn"
        error={errors.productId}
        className="col-span-2 xl:col-span-1"
      >
        <Select
          id={assetFieldId(row, 'productId')}
          value={row.productId ?? (catalogRequired ? '' : MANUAL_PRODUCT_VALUE)}
          disabled={catalogRequired && catalogPending}
          onChange={(e) => onChangeRow((r) => selectAssetProduct(r, e.target.value, products))}
          {...ariaInvalid(row, 'productId', errors)}
        >
          {catalogRequired ? (
            <option value="">{emptyOptionText(row.assetType, catalogPending, options.length > 0)}</option>
          ) : (
            <option value={MANUAL_PRODUCT_VALUE}>Nhập ngoài danh mục (tự ghi hãng, model)</option>
          )}
          {options.map((product) => (
            <option key={product.id} value={product.id}>
              {formatProductOptionLabel(product, diffByProduct.get(product.id))}
            </option>
          ))}
        </Select>
        {row.productId && (
          <p className="text-meta text-fg-2">
            Hãng {row.manufacturer || 'chưa rõ'}, model {row.model || 'chưa rõ'}
          </p>
        )}
        {(needsBrand || needsModel) && (
          <div className="mt-1 grid grid-cols-2 gap-2">
            {needsBrand && (
              <SubTextInput
                row={row}
                field="manufacturer"
                label="Hãng"
                errors={errors}
                onChange={(v) => onChangeRow((r) => ({ ...r, manufacturer: v }))}
              />
            )}
            {needsModel && (
              <SubTextInput
                row={row}
                field="model"
                label="Model"
                errors={errors}
                onChange={(v) => onChangeRow((r) => ({ ...r, model: v }))}
              />
            )}
          </div>
        )}
      </Cell>
      <Cell
        row={row}
        field="serialNumber"
        label="Số serial"
        error={errors.serialNumber}
        className="col-span-2 xl:col-span-1"
      >
        <Input
          id={assetFieldId(row, 'serialNumber')}
          value={row.serialNumber}
          maxLength={ASSET_LIMITS.text}
          autoComplete="off"
          spellCheck={false}
          aria-required
          className="tnum"
          onChange={(e) => onChangeRow((r) => ({ ...r, serialNumber: e.target.value }))}
          {...ariaInvalid(row, 'serialNumber', errors)}
        />
      </Cell>
      <Cell row={row} field="positionCode" label="Vị trí (không bắt buộc)" error={errors.positionCode}>
        <Input
          id={assetFieldId(row, 'positionCode')}
          value={row.positionCode}
          maxLength={ASSET_LIMITS.position}
          autoComplete="off"
          placeholder="R1-C1"
          onChange={(e) => onChangeRow((r) => ({ ...r, positionCode: e.target.value }))}
          {...ariaInvalid(row, 'positionCode', errors)}
        />
      </Cell>
      <Cell row={row} field="warrantyMonths" label="Bảo hành, tháng (theo danh mục)" error={errors.warrantyMonths}>
        <Input
          id={assetFieldId(row, 'warrantyMonths')}
          value={row.warrantyMonths}
          placeholder={row.productId ? 'Theo danh mục' : 'Không áp dụng'}
          readOnly
          disabled
          title={
            row.productId
              ? 'Thời hạn bảo hành lấy theo sản phẩm trong danh mục'
              : 'Thiết bị ngoài danh mục không ghi bảo hành'
          }
          className="tnum"
          {...ariaInvalid(row, 'warrantyMonths', errors)}
        />
      </Cell>
      <div className="col-span-2 flex justify-end xl:col-span-1 xl:pt-0.5">
        {canRemove && (
          <IconButton
            icon="delete"
            label={`Bỏ thiết bị ${index + 1}`}
            tooltip="Bỏ dòng"
            variant="danger-quiet"
            onClick={onRemove}
          />
        )}
      </div>
    </li>
  )
}
