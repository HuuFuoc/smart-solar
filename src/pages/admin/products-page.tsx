import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { SearchInput, Select } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { PageHeader } from '@/components/common/ui/page-header'
import { Pagination } from '@/components/common/ui/pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { DeleteProductDialog } from '@/features/products/DeleteProductDialog'
import { ProductFormDialog } from '@/features/products/ProductFormDialog'
import { ProductImagesDialog } from '@/features/products/ProductImagesDialog'
import { ProductsTable } from '@/features/products/ProductsTable'
import { StopSellingDialog } from '@/features/products/StopSellingDialog'
import { PRODUCT_SORT_OPTIONS, PRODUCT_STATUS_FILTERS, PRODUCT_TYPES, type ProductStatusFilter } from '@/common/product'
import {
  SOLAR_PANEL_QUERY,
  isProductActive,
  panelSpecGaps,
  parseSort,
  productTypeLabel,
} from '@/features/products/productDisplay'
import { useAdminProductsQuery, useChangeProductStatusMutation, useProductsQuery } from '@/hooks/useProducts'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { cx } from '@/utils/cx'

// Quản lý sản phẩm: danh sách GET /api/admin/products (có cả sản phẩm ngừng bán), bấm tên mở trang chi tiết,
// ảnh quản lý trong hộp thoại riêng

const PAGE_SIZE = 20
/** Lấy cả danh mục (PageSize tối đa 100) để có danh sách loại và hãng cho bộ lọc, form */
const ALL_PRODUCTS = { PageSize: 100, SortBy: 'name', SortDirection: 'asc' } as const

type Filter = { search: string; productType: string; brand: string; status: ProductStatusFilter; sort: string }
const defaultFilter: Filter = {
  search: '',
  productType: '',
  brand: '',
  status: 'ALL',
  sort: PRODUCT_SORT_OPTIONS[0]!.value,
}

const unique = (values: (string | null | undefined)[]) =>
  [...new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v)))].sort((a, b) =>
    a.localeCompare(b, 'vi'),
  )

export function AdminProductsPage() {
  const [filter, setFilter] = useState<Filter>(defaultFilter)
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<{ open: boolean; product: ProductResponse | null }>({ open: false, product: null })
  const [deleting, setDeleting] = useState<ProductResponse | null>(null)
  const [hiding, setHiding] = useState<ProductResponse | null>(null)
  const [imagesFor, setImagesFor] = useState<{ id: string; name: string } | null>(null)
  // Ngừng bán / mở bán / hoàn tác dùng chung một mutation nên tự giữ các id đang chờ
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())
  const listRef = useRef<HTMLElement>(null)
  // Nhận focus khi dialog đóng, vì dòng chứa nút vừa bấm có thể đã mất
  const focusAfterDialog = useRef<HTMLElement | null>(null)
  const restoreFocus = () => {
    focusAfterDialog.current?.focus()
    focusAfterDialog.current = null
  }

  const search = useDebouncedValue(filter.search.trim())
  const query = useAdminProductsQuery({
    Search: search,
    ProductType: filter.productType,
    Brand: filter.brand,
    status: filter.status,
    Page: page,
    PageSize: PAGE_SIZE,
    ...parseSort(filter.sort),
  })
  const statusMutation = useChangeProductStatusMutation()
  const all = useAdminProductsQuery(ALL_PRODUCTS)
  // Cảnh báo tính trên toàn bộ tấm pin đang bán (mô phỏng chỉ dùng tấm pin đang bán), không chỉ trang đang xem
  const panels = useProductsQuery(SOLAR_PANEL_QUERY)
  const incompletePanels = (panels.data?.items ?? []).filter((p) => {
    const gaps = panelSpecGaps(p)
    return gaps.power || gaps.size
  }).length

  const products = useMemo(() => query.data?.items ?? [], [query.data])
  const total = query.data?.totalItems ?? 0
  const pages = query.data?.totalPages ?? 0
  const isFiltering =
    filter.search !== '' || filter.productType !== '' || filter.brand !== '' || filter.status !== 'ALL'
  // Đang giữ trang cũ mà trang cũ trống thì coi như đang tải
  const loading = query.isPending || (query.isPlaceholderData && products.length === 0)

  // Trang hiện tại vượt quá số trang (vd. vừa xoá dòng cuối) thì lùi về trang cuối còn dữ liệu
  if (query.data && !query.isFetching && !query.isPlaceholderData && page > Math.max(1, pages))
    setPage(Math.max(1, pages))

  // Luôn có các loại backend kiểm tra riêng (tấm pin, inverter, dịch vụ) trong bộ lọc
  const options = useMemo(() => {
    const items = all.data?.items ?? []
    return {
      productTypes: unique([...PRODUCT_TYPES.map((t) => t.value), ...items.map((p) => p.productType)]),
      brands: unique(items.map((p) => p.brand)),
      categories: unique(items.map((p) => p.category)),
    }
  }, [all.data])

  const updateFilter = (patch: Partial<Filter>) => {
    setFilter((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }
  const clearFilters = () => updateFilter({ search: '', productType: '', brand: '', status: 'ALL' })

  const markPending = (id: string, on: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const changeStatus = async (product: ProductResponse, status: 'ACTIVE' | 'INACTIVE') => {
    if (!product.id) return
    markPending(product.id, true)
    try {
      await statusMutation.mutateAsync({ id: product.id, body: { status } })
      if (status === 'INACTIVE') {
        // Đang lọc "Đang bán" thì dòng vừa ngừng bán biến mất, focus về danh sách
        if (filter.status === 'ACTIVE') focusAfterDialog.current = listRef.current
        setHiding(null)
        toast.success(`Đã ngừng bán ${product.name}`, {
          action: { label: 'Hoàn tác', onClick: () => void changeStatus(product, 'ACTIVE') },
        })
      } else {
        toast.success(`Đã mở bán lại ${product.name}`)
      }
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      markPending(product.id, false)
    }
  }

  const toggleStatus = (product: ProductResponse) => {
    if (isProductActive(product.status)) setHiding(product)
    else void changeStatus(product, 'ACTIVE')
  }

  const hidingBusy = Boolean(hiding?.id && pendingIds.has(hiding.id))
  const from = (page - 1) * PAGE_SIZE + 1
  const to = from + products.length - 1

  return (
    <>
      <PageHeader
        title="Sản phẩm"
        description={
          incompletePanels > 0 ? (
            <Badge tone="danger">
              {incompletePanels} tấm pin thiếu công suất hoặc kích thước, chưa dùng được cho mô phỏng bố trí
            </Badge>
          ) : undefined
        }
        actions={
          <Button variant="primary" icon="add" onClick={() => setForm({ open: true, product: null })}>
            Thêm sản phẩm
          </Button>
        }
      />

      <FilterBar>
        <label className="min-w-0 flex-1 basis-64">
          <span className="sr-only">Tìm sản phẩm</span>
          <SearchInput
            name="search"
            placeholder="Tìm theo tên, SKU, hãng"
            value={filter.search}
            onChange={(e) => updateFilter({ search: e.target.value })}
          />
        </label>
        {/* Backend chỉ lọc khớp đúng cả chuỗi nên dùng danh sách chọn */}
        <label className="w-full sm:w-44">
          <span className="sr-only">Loại sản phẩm</span>
          <Select
            name="productType"
            active={filter.productType !== ''}
            value={filter.productType}
            onChange={(e) => updateFilter({ productType: e.target.value })}
          >
            <option value="">Tất cả loại</option>
            {options.productTypes.map((type) => (
              <option key={type} value={type}>
                {productTypeLabel(type) === type ? type : `${productTypeLabel(type)} (${type})`}
              </option>
            ))}
          </Select>
        </label>
        <label className="w-full sm:w-44">
          <span className="sr-only">Hãng</span>
          <Select
            name="brand"
            active={filter.brand !== ''}
            value={filter.brand}
            onChange={(e) => updateFilter({ brand: e.target.value })}
          >
            <option value="">Tất cả hãng</option>
            {options.brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </Select>
        </label>
        <label className="w-full sm:w-44">
          <span className="sr-only">Trạng thái</span>
          <Select
            name="status"
            active={filter.status !== 'ALL'}
            value={filter.status}
            onChange={(e) => updateFilter({ status: e.target.value as ProductStatusFilter })}
          >
            {PRODUCT_STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="w-full sm:w-48">
          <span className="sr-only">Sắp xếp</span>
          <Select name="sort" value={filter.sort} onChange={(e) => updateFilter({ sort: e.target.value })}>
            {PRODUCT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        {isFiltering && (
          <Button variant="ghost" bleed={false} icon="filter_alt_off" onClick={clearFilters}>
            Xoá bộ lọc
          </Button>
        )}
      </FilterBar>

      {/* Chú thích phân loại sản phẩm & trạng thái */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-container border border-line bg-surface-2 p-3 sm:px-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-meta">
          <span className="font-semibold text-fg flex items-center gap-1.5 pr-2.5 border-r border-line/70">
            <Icon name="palette" className="text-primary text-[18px]" />
            Phân loại thiết bị:
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-soft text-accent-fg border border-accent/20">
            <Icon name="solar_power" className="text-[13px]" />
            Tấm pin mặt trời
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-info-soft text-info border border-info/20">
            <Icon name="electrical_services" className="text-[13px]" />
            Biến tần (Inverter)
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-warn-soft text-warn border border-warn/20">
            <Icon name="battery_charging_full" className="text-[13px]" />
            Pin lưu trữ / Ắc quy
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ok-soft text-ok border border-ok/20">
            <Icon name="build" className="text-[13px]" />
            Vật tư & Dịch vụ
          </span>
        </div>
        <div className="text-meta text-fg-2">
          Tổng số: <strong className="font-semibold text-fg">{total}</strong> sản phẩm
        </div>
      </div>

      <section
        ref={listRef}
        tabIndex={-1}
        aria-label="Danh sách sản phẩm"
        aria-live="polite"
        aria-busy={query.isFetching}
      >
        {query.isError ? (
          <ErrorState
            message={errorMessage(query.error, 'Không tải được danh sách sản phẩm.')}
            onRetry={() => query.refetch()}
          />
        ) : loading ? (
          <div aria-label="Đang tải" className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title={isFiltering ? 'Không có sản phẩm nào khớp bộ lọc' : 'Chưa có sản phẩm nào'}
            description={
              isFiltering ? 'Thử từ khoá khác hoặc bỏ bớt bộ lọc.' : 'Bấm "Thêm sản phẩm" để tạo sản phẩm đầu tiên.'
            }
            action={
              isFiltering ? (
                <Button icon="filter_alt_off" onClick={clearFilters}>
                  Xoá bộ lọc
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={cx(query.isFetching && 'opacity-70')}>
            <ProductsTable
              products={products}
              detailPath={(id) => withId(ROUTES.admin.product, id)}
              busyIds={pendingIds}
              onEdit={(product) => setForm({ open: true, product })}
              onToggleStatus={toggleStatus}
              onDelete={setDeleting}
              onImages={(product) => product.id && setImagesFor({ id: product.id, name: product.name ?? '' })}
            />
          </div>
        )}
      </section>

      {!query.isError && !loading && products.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="tnum text-meta text-fg-2">
            Hiển thị {from}–{to} trên {total} sản phẩm
          </p>
          {pages > 1 && <Pagination page={page} pages={pages} onChange={setPage} />}
        </div>
      )}

      <ProductFormDialog
        open={form.open}
        product={form.product}
        suggestions={{ productTypes: options.productTypes, categories: options.categories }}
        onOpenChange={(open) => setForm((prev) => ({ ...prev, open }))}
      />
      <ProductImagesDialog
        productId={imagesFor?.id ?? null}
        productName={imagesFor?.name ?? ''}
        onOpenChange={(open) => !open && setImagesFor(null)}
      />
      <DeleteProductDialog
        product={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          focusAfterDialog.current = listRef.current
        }}
        onAfterClose={restoreFocus}
      />
      <StopSellingDialog
        product={hiding}
        busy={hidingBusy}
        onConfirm={(product) => void changeStatus(product, 'INACTIVE')}
        onOpenChange={(open) => !open && setHiding(null)}
        onAfterClose={restoreFocus}
      />
    </>
  )
}
