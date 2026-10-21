import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { DialogFooter, DialogTitle, ModalDialog } from '@/components/common/ui/dialog'
import { SearchInput, Select } from '@/components/common/ui/field'
import { FilterBar } from '@/components/common/ui/filter-bar'
import { PageHeader } from '@/components/common/ui/page-header'
import { Pagination } from '@/components/common/ui/pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { formatDateTime } from '@/features/pre-surveys/preSurveyDisplay'
import { DeleteProductDialog } from '@/features/products/DeleteProductDialog'
import { ProductFormDialog } from '@/features/products/ProductFormDialog'
import { ProductsTable } from '@/features/products/ProductsTable'
import { PRODUCT_SORT_OPTIONS, SOLAR_PANEL_TYPE } from '@/common/product'
import {
  SOLAR_PANEL_QUERY,
  isProductActive,
  panelSpecGaps,
  parseSort,
  productTypeLabel,
} from '@/features/products/productDisplay'
import { readHiddenProducts, writeHiddenProducts, type HiddenProduct } from '@/features/products/hiddenProducts'
import { useChangeProductStatusMutation, useProductsQuery } from '@/hooks/useProducts'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { ProductResponse } from '@/types/res/adminProductsRes'
import { cx } from '@/utils/cx'

// Quản lý sản phẩm: danh sách đọc GET /api/products, bấm dòng mở trang chi tiết
// API này không trả sản phẩm ngừng bán nên cuối trang có mục "Đã ngừng bán" (hiddenProducts.ts)
// Bộ lọc và trang lưu trên URL để Back quay lại đúng chỗ

const PAGE_SIZE = 20
/** Lấy cả danh mục (PageSize tối đa 100) để có danh sách loại và hãng cho bộ lọc, form */
const ALL_PRODUCTS = { PageSize: 100, SortBy: 'name', SortDirection: 'asc' } as const

type Filter = { search: string; productType: string; brand: string; sort: string }
const defaultFilter: Filter = { search: '', productType: '', brand: '', sort: PRODUCT_SORT_OPTIONS[0]!.value }

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
  // Sản phẩm đã ngừng bán từ trình duyệt này, vì backend không trả về nữa (hiddenProducts.ts)
  const [hidden, setHidden] = useState<HiddenProduct[]>(readHiddenProducts)
  // Ngừng bán / mở bán / hoàn tác dùng chung một mutation nên tự giữ các id đang chờ
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set())
  const listRef = useRef<HTMLElement>(null)
  const hiddenHeadingRef = useRef<HTMLHeadingElement>(null)
  // Nhận focus khi dialog đóng, vì dòng chứa nút vừa bấm đã mất
  const focusAfterDialog = useRef<HTMLElement | null>(null)
  const restoreFocus = () => {
    focusAfterDialog.current?.focus()
    focusAfterDialog.current = null
  }

  const search = useDebouncedValue(filter.search.trim())
  const query = useProductsQuery({
    Search: search,
    ProductType: filter.productType,
    Brand: filter.brand,
    Page: page,
    PageSize: PAGE_SIZE,
    ...parseSort(filter.sort),
  })
  const statusMutation = useChangeProductStatusMutation()
  const all = useProductsQuery(ALL_PRODUCTS)
  // Cảnh báo tính trên toàn bộ tấm pin, không chỉ trang đang xem
  const panels = useProductsQuery(SOLAR_PANEL_QUERY)
  const incompletePanels = (panels.data?.items ?? []).filter((p) => {
    const gaps = panelSpecGaps(p)
    return gaps.power || gaps.size
  }).length

  const products = useMemo(() => query.data?.items ?? [], [query.data])
  const total = query.data?.totalItems ?? 0
  const pages = query.data?.totalPages ?? 0
  const isFiltering = filter.search !== '' || filter.productType !== '' || filter.brand !== ''
  // Đang giữ trang cũ mà trang cũ trống thì coi như đang tải
  const loading = query.isPending || (query.isPlaceholderData && products.length === 0)

  // Trang hiện tại vượt quá số trang (vd. vừa xoá dòng cuối) thì lùi về trang cuối còn dữ liệu
  if (query.data && !query.isFetching && !query.isPlaceholderData && page > Math.max(1, pages))
    setPage(Math.max(1, pages))

  // Luôn có SOLAR_PANEL trong bộ lọc vì backend kiểm tra riêng mã này
  const options = useMemo(() => {
    const items = all.data?.items ?? []
    return {
      productTypes: unique([SOLAR_PANEL_TYPE, ...items.map((p) => p.productType)]),
      brands: unique(items.map((p) => p.brand)),
      categories: unique(items.map((p) => p.category)),
    }
  }, [all.data])

  const updateFilter = (patch: Partial<Filter>) => {
    setFilter((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }
  const clearFilters = () => updateFilter({ search: '', productType: '', brand: '' })

  const markPending = (id: string, on: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  // Dựa trên giá trị mới nhất vì nút "Hoàn tác" trong toast giữ closure cũ
  const updateHidden = (change: (list: HiddenProduct[]) => HiddenProduct[]) =>
    setHidden((prev) => {
      const next = change(prev)
      writeHiddenProducts(next)
      return next
    })

  // Dòng vừa thao tác biến khỏi bảng thì chuyển focus tới chỗ còn đó
  const focusLater = (target: { current: HTMLElement | null }) => requestAnimationFrame(() => target.current?.focus())

  const reopen = async (entry: HiddenProduct) => {
    markPending(entry.id, true)
    try {
      await statusMutation.mutateAsync({ id: entry.id, body: { status: 'ACTIVE' } })
      updateHidden((list) => list.filter((h) => h.id !== entry.id))
      toast.success(`Đã mở bán lại ${entry.name}`)
      focusLater(listRef)
    } catch (error) {
      // 404 là sản phẩm đã bị xoá hẳn
      if (isApiError(error) && error.status === 404) updateHidden((list) => list.filter((h) => h.id !== entry.id))
      toast.error(errorMessage(error))
    } finally {
      markPending(entry.id, false)
    }
  }

  const hide = async (product: ProductResponse) => {
    if (!product.id) return
    const entry: HiddenProduct = {
      id: product.id,
      name: product.name ?? '',
      sku: product.sku ?? '',
      hiddenAt: new Date().toISOString(),
    }
    // Ghi nhớ trước khi gọi API, để tải lại trang giữa chừng vẫn mở bán lại được
    updateHidden((list) => [entry, ...list.filter((h) => h.id !== entry.id)])
    markPending(entry.id, true)
    try {
      await statusMutation.mutateAsync({ id: entry.id, body: { status: 'INACTIVE' } })
      focusAfterDialog.current = hiddenHeadingRef.current
      setHiding(null)
      toast.success(`Đã ngừng bán ${entry.name}`, { action: { label: 'Hoàn tác', onClick: () => void reopen(entry) } })
    } catch (error) {
      // 4xx là chắc chắn chưa đổi nên bỏ ghi nhớ, lỗi mạng / 5xx thì có thể đã đổi nên giữ lại
      if (isApiError(error) && error.status >= 400 && error.status < 500)
        updateHidden((list) => list.filter((h) => h.id !== entry.id))
      toast.error(errorMessage(error))
    } finally {
      markPending(entry.id, false)
    }
  }

  // Bảng chỉ có sản phẩm đang bán nên thao tác trên dòng là ngừng bán
  const toggleStatus = (product: ProductResponse) => {
    if (isProductActive(product.status)) setHiding(product)
    else if (product.id) void reopen({ id: product.id, name: product.name ?? '', sku: product.sku ?? '', hiddenAt: '' })
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
            <Badge tone="danger" icon="warning">
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
        <label className="w-full sm:w-52">
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
        <label className="w-full sm:w-56">
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
            title={isFiltering ? 'Không có sản phẩm nào khớp bộ lọc' : 'Chưa có sản phẩm nào đang bán'}
            description={
              isFiltering
                ? 'Thử từ khoá khác hoặc bỏ bớt bộ lọc.'
                : hidden.length > 0
                  ? 'Sản phẩm đã ngừng bán nằm ở mục bên dưới.'
                  : 'Bấm "Thêm sản phẩm" để tạo sản phẩm đầu tiên.'
            }
            action={isFiltering ? <Button onClick={clearFilters}>Xoá bộ lọc</Button> : undefined}
          />
        ) : (
          <div className={cx(query.isFetching && 'opacity-70')}>
            <ProductsTable
              products={products}
              busyIds={pendingIds}
              onEdit={(product) => setForm({ open: true, product })}
              onToggleStatus={toggleStatus}
              onDelete={setDeleting}
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

      {hidden.length > 0 && (
        <section className="mt-8 border-t border-line pt-4" aria-labelledby="hidden-products">
          <h2 ref={hiddenHeadingRef} id="hidden-products" tabIndex={-1} className="text-title font-semibold">
            Đã ngừng bán
          </h2>
          <p className="mt-1 max-w-prose text-body text-fg-2">
            Backend không trả sản phẩm ngừng bán trong danh sách. Đây là các sản phẩm đã ngừng bán từ trình duyệt này.
          </p>
          <ul className="mt-3 divide-y divide-line">
            {hidden.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-fg">{h.name || 'Sản phẩm chưa đặt tên'}</p>
                  <p className="tnum text-meta text-fg-3">
                    {h.sku}
                    {h.hiddenAt && `, ngừng bán lúc ${formatDateTime(h.hiddenAt)}`}
                  </p>
                </div>
                <Button size="sm" variant="soft" disabled={pendingIds.has(h.id)} onClick={() => void reopen(h)}>
                  {pendingIds.has(h.id) ? 'Đang mở bán…' : 'Mở bán lại'}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProductFormDialog
        open={form.open}
        product={form.product}
        suggestions={{ productTypes: options.productTypes, categories: options.categories }}
        onOpenChange={(open) => setForm((prev) => ({ ...prev, open }))}
      />
      <DeleteProductDialog
        product={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          focusAfterDialog.current = listRef.current
        }}
        onAfterClose={restoreFocus}
      />
      <ModalDialog
        open={Boolean(hiding)}
        onOpenChange={(open) => !open && setHiding(null)}
        dismissible={!hidingBusy}
        onAfterClose={restoreFocus}
        aria-label="Ngừng bán sản phẩm"
      >
        <DialogTitle>Ngừng bán {hiding?.name}?</DialogTitle>
        <p className="mt-2 text-body text-fg-2">
          Sản phẩm ngừng bán bị ẩn khỏi mọi danh mục, kể cả bảng này (backend không trả về). Sau khi ngừng bán, sản phẩm
          nằm trong mục &quot;Đã ngừng bán&quot; ở cuối trang trên trình duyệt này để mở bán lại khi cần.
        </p>
        <DialogFooter>
          <Button variant="ghost" disabled={hidingBusy} onClick={() => setHiding(null)}>
            Huỷ
          </Button>
          <Button variant="danger" disabled={hidingBusy} onClick={() => hiding && void hide(hiding)}>
            {hidingBusy ? 'Đang ngừng bán…' : 'Ngừng bán'}
          </Button>
        </DialogFooter>
      </ModalDialog>
    </>
  )
}
