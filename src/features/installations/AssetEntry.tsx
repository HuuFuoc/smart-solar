import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ASSET_TYPES } from '@/common/installation'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, IconButton } from '@/components/common/ui/button'
import { Input, Select } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import {
  ASSET_LIMITS,
  MANUAL_PRODUCT_VALUE,
  changeAssetType,
  filterProductsForAssetType,
  formatProductOptionLabel,
  hasErrors,
  newAssetRow,
  requiresCatalogProduct,
  selectAssetProduct,
  toAssetRequests,
  validateAssetRows,
  type AssetField,
  type AssetRow,
  type AssetRowErrors,
} from '@/features/installations/assetForm'
import { useProductsQuery } from '@/hooks/useProducts'
import { useRegisterAssetsMutation } from '@/hooks/useTechnicianInstallations'
import { errorMessage } from '@/services/api/errors'
import { PRODUCT_PAGE_SIZE_MAX } from '@/services/productService'
import type { AssetView, EquipmentComparisonView } from '@/types/res/customerInstallationsRes'
import { cx } from '@/utils/cx'

// Từ xl mỗi thiết bị là một hàng thẳng cột với dòng tiêu đề; màn hẹp hơn thì mỗi thiết bị một khối có nhãn
const COLUMNS = 'xl:grid-cols-[2rem_9rem_minmax(0,1.9fr)_minmax(0,1.1fr)_7rem_7.5rem_2.5rem]'
const HEADERS = ['', 'Loại', 'Sản phẩm có sẵn', 'Số serial', 'Vị trí', 'Bảo hành (tháng)', '']

const fieldId = (row: AssetRow, field: AssetField) => `asset-${row.key}-${field}`

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
      <label htmlFor={fieldId(row, field)} className="text-meta text-fg-2 xl:sr-only">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${fieldId(row, field)}-error`} className="text-meta text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function emptyProductPlaceholder(assetType: string, isPending: boolean, hasOptions: boolean) {
  if (isPending) return 'Đang tải danh sách sản phẩm…'
  if (assetType === 'PANEL') return hasOptions ? 'Chọn tấm pin có sẵn…' : 'Chưa có tấm pin nào trong danh mục'
  return hasOptions ? 'Chọn inverter có sẵn…' : 'Chưa có inverter nào trong danh mục'
}

// Ghi thiết bị đã lắp, nhiều dòng một lần. Thiết bị đã lưu không sửa hay xoá được nên báo lỗi trước khi gửi
export function AssetEntry({
  projectId,
  saved,
  equipment,
  onClose,
}: {
  projectId: string
  saved: AssetView[]
  equipment?: EquipmentComparisonView | null
  onClose: () => void
}) {
  const register = useRegisterAssetsMutation()
  const catalog = useProductsQuery({ PageSize: PRODUCT_PAGE_SIZE_MAX, SortBy: 'name', SortDirection: 'asc' })
  const products = useMemo(() => catalog.data?.items ?? [], [catalog.data])
  const differences = useMemo(() => equipment?.differences ?? [], [equipment])
  const diffByProduct = useMemo(() => new Map(differences.map((d) => [d.productId, d])), [differences])
  const contractedMissing = useMemo(
    () => differences.filter((d) => d.contractedQuantity > d.installedQuantity),
    [differences],
  )

  const [rows, setRows] = useState<AssetRow[]>(() => [newAssetRow()])
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const focusKey = useRef<number | null>(null)
  const errors: AssetRowErrors[] = checked ? validateAssetRows(rows, saved) : rows.map(() => ({}))

  // Dòng vừa thêm đã chép loại / sản phẩm / hãng / model, nên đưa con trỏ vào ô serial
  useEffect(() => {
    if (focusKey.current === null) return
    document.getElementById(`asset-${focusKey.current}-serialNumber`)?.focus()
    focusKey.current = null
  }, [rows])

  const update = (key: number, field: AssetField, value: string) => {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
    setError(null)
  }

  const updateRow = (key: number, transform: (row: AssetRow) => AssetRow) => {
    setRows((current) => current.map((r) => (r.key === key ? transform(r) : r)))
    setError(null)
  }

  const addRow = () => {
    const row = newAssetRow(rows.at(-1))
    focusKey.current = row.key
    setRows((current) => [...current, row])
  }

  const removeRow = (key: number) => setRows((current) => current.filter((r) => r.key !== key))

  async function submit() {
    if (register.isPending) return
    setChecked(true)
    const found = validateAssetRows(rows, saved)
    if (hasErrors(found)) {
      const i = found.findIndex((e) => Object.keys(e).length > 0)
      const field = Object.keys(found[i]!)[0] as AssetField
      document.getElementById(fieldId(rows[i]!, field))?.focus()
      return
    }
    try {
      await register.mutateAsync({ id: projectId, assets: toAssetRequests(rows) })
      toast.success(`Đã lưu ${rows.length} thiết bị.`)
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const invalid = (row: AssetRow, field: AssetField, i: number) => {
    const message = errors[i]?.[field]
    return message
      ? { 'aria-invalid': true as const, 'aria-describedby': `${fieldId(row, field)}-error` }
      : { 'aria-invalid': undefined }
  }

  const hasMissingRequiredCatalog =
    !catalog.isPending &&
    !catalog.isError &&
    rows.some(
      (r) => requiresCatalogProduct(r.assetType) && filterProductsForAssetType(products, r.assetType, differences).length === 0,
    )

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Notice tone="warn">
        Thiết bị đã lưu không sửa hay xoá được trên hệ thống. Chọn đúng sản phẩm trong danh mục và kiểm tra số serial
        trước khi lưu.
      </Notice>
      {contractedMissing.length > 0 && (
        <Notice tone="info">
          Thiết bị theo hợp đồng cần ghi:{' '}
          {contractedMissing
            .map(
              (d) =>
                `${d.name?.trim() || (d.productType === 'INVERTER' ? 'Inverter' : 'Tấm pin')} (${d.installedQuantity}/${d.contractedQuantity})`,
            )
            .join(', ')}
          .
        </Notice>
      )}
      {catalog.isError && (
        <Notice tone="warn">
          <span className="flex flex-wrap items-center gap-2">
            <span>Không tải được danh mục sản phẩm ({catalog.error?.message}).</span>
            <button type="button" className="ui-link font-medium" onClick={() => void catalog.refetch()}>
              Thử lại
            </button>
          </span>
        </Notice>
      )}
      {hasMissingRequiredCatalog && (
        <Notice tone="warn">
          Danh mục hiện chưa có sản phẩm đang bán cho loại Tấm pin hoặc Inverter đã chọn. Liên hệ quản trị để bổ sung
          vào danh mục sản phẩm trước khi ghi thiết bị.
        </Notice>
      )}
      <div aria-hidden className={cx('hidden gap-x-3 border-b border-line pb-2 text-meta text-fg-2 xl:grid', COLUMNS)}>
        {HEADERS.map((h, i) => (
          <span key={i}>{h}</span>
        ))}
      </div>
      <ol className="space-y-4 xl:space-y-3">
        {rows.map((row, i) => {
          const catalogRequired = requiresCatalogProduct(row.assetType)
          const options = filterProductsForAssetType(products, row.assetType, differences)
          const showManualInputs = !catalogRequired && !row.productId
          const selectValue = row.productId ?? (catalogRequired ? '' : MANUAL_PRODUCT_VALUE)
          const needsBrandFallback = Boolean(row.productId) && !row.manufacturer.trim()
          const needsModelFallback = Boolean(row.productId) && !row.model.trim()

          return (
            <li
              key={row.key}
              aria-label={`Thiết bị ${i + 1}`}
              className={cx(
                'grid grid-cols-2 gap-x-3 gap-y-3 max-xl:rounded-container max-xl:border max-xl:border-line max-xl:p-4 xl:items-start',
                COLUMNS,
              )}
            >
              <span className="tnum col-span-2 text-body font-semibold xl:col-span-1 xl:pt-2.5 xl:font-normal xl:text-fg-2">
                <span className="xl:hidden">Thiết bị </span>
                {i + 1}
              </span>
              <Cell row={row} field="assetType" label="Loại" error={errors[i]?.assetType} className="col-span-2 xl:col-span-1">
                <Select
                  id={fieldId(row, 'assetType')}
                  value={row.assetType}
                  onChange={(e) => updateRow(row.key, (r) => changeAssetType(r, e.target.value, products))}
                  {...invalid(row, 'assetType', i)}
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
                error={errors[i]?.productId}
                className="col-span-2 xl:col-span-1"
              >
                <Select
                  id={fieldId(row, 'productId')}
                  value={selectValue}
                  disabled={catalogRequired && catalog.isPending}
                  onChange={(e) => updateRow(row.key, (r) => selectAssetProduct(r, e.target.value, products))}
                  {...invalid(row, 'productId', i)}
                >
                  {catalogRequired ? (
                    <option value="">{emptyProductPlaceholder(row.assetType, catalog.isPending, options.length > 0)}</option>
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
                    Hãng: {row.manufacturer || 'Chưa rõ'} · Model: {row.model || 'Chưa rõ'}
                  </p>
                )}
                {(showManualInputs || needsBrandFallback || needsModelFallback) && (
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {(showManualInputs || needsBrandFallback) && (
                      <div className="flex min-w-0 flex-col gap-1">
                        <label htmlFor={fieldId(row, 'manufacturer')} className="text-meta text-fg-2">
                          Hãng *
                        </label>
                        <Input
                          id={fieldId(row, 'manufacturer')}
                          size="sm"
                          value={row.manufacturer}
                          maxLength={ASSET_LIMITS.text}
                          autoComplete="off"
                          aria-required
                          onChange={(e) => update(row.key, 'manufacturer', e.target.value)}
                          {...invalid(row, 'manufacturer', i)}
                        />
                        {errors[i]?.manufacturer && (
                          <p id={`${fieldId(row, 'manufacturer')}-error`} className="text-meta text-danger" role="alert">
                            {errors[i]?.manufacturer}
                          </p>
                        )}
                      </div>
                    )}
                    {(showManualInputs || needsModelFallback) && (
                      <div className="flex min-w-0 flex-col gap-1">
                        <label htmlFor={fieldId(row, 'model')} className="text-meta text-fg-2">
                          Model *
                        </label>
                        <Input
                          id={fieldId(row, 'model')}
                          size="sm"
                          value={row.model}
                          maxLength={ASSET_LIMITS.text}
                          autoComplete="off"
                          aria-required
                          onChange={(e) => update(row.key, 'model', e.target.value)}
                          {...invalid(row, 'model', i)}
                        />
                        {errors[i]?.model && (
                          <p id={`${fieldId(row, 'model')}-error`} className="text-meta text-danger" role="alert">
                            {errors[i]?.model}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Cell>
              <Cell
                row={row}
                field="serialNumber"
                label="Số serial"
                error={errors[i]?.serialNumber}
                className="col-span-2 xl:col-span-1"
              >
                <Input
                  id={fieldId(row, 'serialNumber')}
                  value={row.serialNumber}
                  maxLength={ASSET_LIMITS.text}
                  autoComplete="off"
                  spellCheck={false}
                  aria-required
                  className="tnum"
                  onChange={(e) => update(row.key, 'serialNumber', e.target.value)}
                  {...invalid(row, 'serialNumber', i)}
                />
              </Cell>
              <Cell row={row} field="positionCode" label="Vị trí (không bắt buộc)" error={errors[i]?.positionCode}>
                <Input
                  id={fieldId(row, 'positionCode')}
                  value={row.positionCode}
                  maxLength={ASSET_LIMITS.position}
                  autoComplete="off"
                  placeholder="R1-C1"
                  onChange={(e) => update(row.key, 'positionCode', e.target.value)}
                  {...invalid(row, 'positionCode', i)}
                />
              </Cell>
              <Cell
                row={row}
                field="warrantyMonths"
                label="Bảo hành, tháng (theo danh mục)"
                error={errors[i]?.warrantyMonths}
              >
                <Input
                  id={fieldId(row, 'warrantyMonths')}
                  value={row.warrantyMonths}
                  placeholder={row.productId ? 'Theo danh mục' : 'Không áp dụng'}
                  readOnly
                  disabled
                  title={
                    row.productId
                      ? 'Thời hạn bảo hành lấy theo sản phẩm trong danh mục'
                      : 'Thiết bị ngoài danh mục không ghi thời hạn bảo hành'
                  }
                  className="tnum"
                  {...invalid(row, 'warrantyMonths', i)}
                />
              </Cell>
              <div className="col-span-2 flex justify-end xl:col-span-1 xl:pt-0.5">
                {rows.length > 1 && (
                  <IconButton
                    icon="delete"
                    label={`Bỏ thiết bị ${i + 1}`}
                    tooltip="Bỏ dòng"
                    variant="danger-quiet"
                    onClick={() => removeRow(row.key)}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="soft" size="sm" icon="add" disabled={rows.length >= ASSET_LIMITS.perRequest} onClick={addRow}>
          Thêm dòng
        </Button>
        <span className="ml-auto flex flex-wrap items-center gap-3">
          <Button icon="close" size="sm" variant="secondary" disabled={register.isPending} onClick={onClose}>
            Huỷ
          </Button>
          <Button icon="save" type="submit" size="sm" variant="soft" disabled={register.isPending}>
            {register.isPending ? 'Đang lưu…' : `Lưu ${rows.length} thiết bị`}
          </Button>
        </span>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
          <Icon name="error" className="shrink-0 text-[20px]" />
          {error}
        </p>
      )}
    </form>
  )
}
