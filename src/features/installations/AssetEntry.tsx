import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { AssetEntryRow } from '@/features/installations/AssetEntryRow'
import {
  ASSET_LIMITS,
  assetFieldId,
  filterProductsForAssetType,
  hasErrors,
  newAssetRow,
  requiresCatalogProduct,
  toAssetRequests,
  validateAssetRows,
  type AssetField,
  type AssetRow,
} from '@/features/installations/assetForm'
import { useProductsQuery } from '@/hooks/useProducts'
import { useRegisterAssetsMutation } from '@/hooks/useTechnicianInstallations'
import { errorMessage } from '@/services/api/errors'
import { PRODUCT_PAGE_SIZE_MAX } from '@/services/productService'
import type { AssetView, EquipmentComparisonView } from '@/types/res/customerInstallationsRes'
import { cx } from '@/utils/cx'

const COLUMNS = 'xl:grid-cols-[2rem_9rem_minmax(0,1.9fr)_minmax(0,1.1fr)_7rem_7.5rem_2.5rem]'
const HEADERS = ['', 'Loại', 'Sản phẩm có sẵn', 'Số serial', 'Vị trí', 'Bảo hành (tháng)', '']

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
  const errors = checked ? validateAssetRows(rows, saved) : rows.map(() => ({}))

  useEffect(() => {
    if (focusKey.current === null) return
    document.getElementById(`asset-${focusKey.current}-serialNumber`)?.focus()
    focusKey.current = null
  }, [rows])

  const updateRow = (key: number, transform: (row: AssetRow) => AssetRow) => {
    setRows((current) => current.map((r) => (r.key === key ? transform(r) : r)))
    setError(null)
  }

  const addRow = () => {
    const row = newAssetRow(rows.at(-1))
    focusKey.current = row.key
    setRows((current) => [...current, row])
  }

  async function submit() {
    if (register.isPending) return
    setChecked(true)
    const found = validateAssetRows(rows, saved)
    if (hasErrors(found)) {
      const i = found.findIndex((e) => Object.keys(e).length > 0)
      const field = Object.keys(found[i]!)[0] as AssetField
      document.getElementById(assetFieldId(rows[i]!, field))?.focus()
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

  const missingCatalog =
    !catalog.isPending &&
    !catalog.isError &&
    rows.some((r) => requiresCatalogProduct(r.assetType) && filterProductsForAssetType(products, r.assetType, differences).length === 0)

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
        Thiết bị đã lưu không sửa hay xoá được trên hệ thống. Chọn đúng sản phẩm trong danh mục và kiểm tra số serial trước khi lưu.
      </Notice>
      {contractedMissing.length > 0 && (
        <Notice tone="info">
          Thiết bị theo hợp đồng cần ghi:{' '}
          {contractedMissing
            .map((d) => `${d.name?.trim() || (d.productType === 'INVERTER' ? 'Inverter' : 'Tấm pin')} (${d.installedQuantity}/${d.contractedQuantity})`)
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
          Danh mục chưa có sản phẩm đang bán cho loại Tấm pin hoặc Inverter đã chọn. Liên hệ quản trị để bổ sung trước khi ghi thiết bị.
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
            canRemove={rows.length > 1}
            className={COLUMNS}
            errors={errors[i]!}
            products={products}
            differences={differences}
            diffByProduct={diffByProduct}
            catalogPending={catalog.isPending}
            onChangeRow={(fn) => updateRow(row.key, fn)}
            onRemove={() => setRows((current) => current.filter((r) => r.key !== row.key))}
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
