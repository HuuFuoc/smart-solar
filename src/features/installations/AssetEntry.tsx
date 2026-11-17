import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { AssetEntryRow } from '@/features/installations/AssetEntryRow'
import {
  ASSET_LIMITS,
  assetCount,
  assetFieldId,
  entryCount,
  filterProductsForAssetType,
  hasErrors,
  newAssetRow,
  requiresCatalogProduct,
  serverRowErrors,
  toAssetRequests,
  validateAssetRows,
  type AssetField,
  type AssetRow,
  type AssetRowErrors,
} from '@/features/installations/assetForm'
import { useProductsQuery } from '@/hooks/useProducts'
import { useRegisterAssetsMutation } from '@/hooks/useTechnicianInstallations'
import { errorMessage, isApiError } from '@/services/api/errors'
import { PRODUCT_PAGE_SIZE_MAX } from '@/services/productService'
import type { AssetView, EquipmentComparisonView } from '@/types/res/customerInstallationsRes'
import { cx } from '@/utils/cx'

const COLUMNS = 'xl:grid-cols-[2rem_9rem_minmax(0,1.6fr)_6.5rem_minmax(0,1fr)_minmax(0,0.8fr)_7.5rem_2.5rem]'
const HEADERS = [
  '',
  'Loại',
  'Sản phẩm có sẵn',
  'Số lượng',
  'Số serial (nếu ghi từng thiết bị)',
  'Vị trí lắp (không bắt buộc)',
  'Bảo hành (tháng)',
  '',
]

// Ghi thiết bị đã lắp: mỗi dòng một sản phẩm, theo số lượng hoặc theo danh sách serial. Thiết bị đã lưu không sửa hay xoá
// được nên báo lỗi trước khi gửi
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
  // Lỗi backend chỉ đúng với các dòng lúc gửi: sửa dòng nào là bỏ
  const [rejected, setRejected] = useState<AssetRowErrors[] | null>(null)
  const focusKey = useRef<number | null>(null)
  const errors = rejected ?? (checked ? validateAssetRows(rows, saved) : rows.map(() => ({})))
  const total = assetCount(rows)

  useEffect(() => {
    if (focusKey.current === null) return
    document.getElementById(assetFieldId({ key: focusKey.current }, 'assetType'))?.focus()
    focusKey.current = null
  }, [rows])

  const updateRow = (key: number, transform: (row: AssetRow) => AssetRow) => {
    setRows((current) => current.map((r) => (r.key === key ? transform(r) : r)))
    setError(null)
    setRejected(null)
  }

  const focusFirstError = (found: AssetRowErrors[]) => {
    const i = found.findIndex((e) => Object.keys(e).length > 0)
    if (i >= 0) document.getElementById(assetFieldId(rows[i]!, Object.keys(found[i]!)[0] as AssetField))?.focus()
  }

  const addRow = () => {
    const row = newAssetRow()
    focusKey.current = row.key
    setRows((current) => [...current, row])
  }

  async function submit() {
    if (register.isPending) return
    setChecked(true)
    const found = validateAssetRows(rows, saved)
    if (hasErrors(found)) return focusFirstError(found)
    const entries = entryCount(rows)
    if (entries > ASSET_LIMITS.perRequest) {
      setError(
        `Mỗi lần lưu tối đa ${ASSET_LIMITS.perRequest} số serial và lô. Đang có ${entries}, lưu bớt rồi ghi tiếp phần còn lại.`,
      )
      return
    }
    try {
      await register.mutateAsync({ id: projectId, assets: toAssetRequests(rows) })
      toast.success(`Đã lưu ${total.toLocaleString('vi-VN')} thiết bị.`)
      onClose()
    } catch (e) {
      const byRow = isApiError(e) ? serverRowErrors(e.fieldErrors, rows) : null
      if (byRow) {
        setRejected(byRow)
        focusFirstError(byRow)
      }
      setError(errorMessage(e))
    }
  }

  const missingCatalog =
    !catalog.isPending &&
    !catalog.isError &&
    rows.some(
      (r) =>
        requiresCatalogProduct(r.assetType) &&
        filterProductsForAssetType(products, r.assetType, differences).length === 0,
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
        Thiết bị đã lưu không sửa hay xoá được trên hệ thống. Mỗi dòng ghi theo số lượng, hoặc theo số serial từng thiết
        bị; chọn đúng sản phẩm trong danh mục và kiểm tra lại trước khi lưu.
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
      {missingCatalog && (
        <Notice tone="warn">
          Danh mục chưa có sản phẩm đang bán cho loại Tấm pin hoặc Inverter đã chọn. Liên hệ quản trị để bổ sung trước
          khi ghi thiết bị.
        </Notice>
      )}
      <div aria-hidden className={cx('hidden gap-x-3 border-b border-line pb-2 text-meta text-fg-2 xl:grid', COLUMNS)}>
        {HEADERS.map((h, i) => (
          <span key={i}>{h}</span>
        ))}
      </div>
      <ol className="space-y-4 xl:space-y-3">
        {rows.map((row, i) => (
          <AssetEntryRow
            key={row.key}
            row={row}
            index={i}
            nextRowKey={rows[i + 1]?.key ?? null}
            canRemove={rows.length > 1}
            className={COLUMNS}
            errors={errors[i]!}
            products={products}
            differences={differences}
            diffByProduct={diffByProduct}
            catalogPending={catalog.isPending}
            onChangeRow={(fn) => updateRow(row.key, fn)}
            onRemove={() => {
              setRows((current) => current.filter((r) => r.key !== row.key))
              setRejected(null)
            }}
          />
        ))}
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
            {register.isPending
              ? 'Đang lưu…'
              : total > 0
                ? `Lưu ${total.toLocaleString('vi-VN')} thiết bị`
                : 'Lưu thiết bị'}
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
