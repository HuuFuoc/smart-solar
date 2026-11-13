import { useEffect, useState } from 'react'
import { SearchInput, Select } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { ListPager } from '@/components/common/ui/pagination'
import { ErrorState } from '@/components/common/ui/states'
import {
  CustomerProductEmptyState,
  CustomerProductGrid,
  CustomerProductGridSkeleton,
} from '@/features/products/CustomerProductGrid'
import { PRODUCT_SORT_OPTIONS } from '@/common/product'
import { isProductActive, parseSort, productTypeLabel } from '@/features/products/productDisplay'
import { useProductsQuery } from '@/hooks/useProducts'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ROUTES, withId } from '@/routes/paths'
import { cx } from '@/utils/cx'

// Danh mục sản phẩm trong các portal. Hiển thị dạng lưới card hiện đại cho mọi role
const PAGE_SIZE = 12

function CatalogPage({ detailPattern }: { detailPattern: string }) {
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [knownTypes, setKnownTypes] = useState<string[]>([])
  const [sort, setSort] = useState(PRODUCT_SORT_OPTIONS[0]!.value)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim())

  const query = useProductsQuery({
    Search: debouncedSearch,
    ProductType: selectedType || undefined,
    Page: page,
    PageSize: PAGE_SIZE,
    ...parseSort(sort),
  })

  // Cập nhật danh sách loại sản phẩm thực tế từ dữ liệu tải về
  useEffect(() => {
    if (query.data?.items) {
      const types = query.data.items.map((p) => p.productType?.trim()).filter((t): t is string => Boolean(t))
      if (types.length > 0) {
        setKnownTypes((prev) => Array.from(new Set([...prev, ...types])))
      }
    }
  }, [query.data?.items])

  const activeProducts = (query.data?.items ?? []).filter((p) => isProductActive(p.status))
  // Lọc thêm ở client trong trường hợp API không hỗ trợ param ProductType
  const products = selectedType
    ? activeProducts.filter((p) => p.productType?.trim().toUpperCase() === selectedType.toUpperCase())
    : activeProducts

  const pages = query.data?.totalPages ?? 0
  const from = (page - 1) * PAGE_SIZE + 1

  const handleResetFilters = () => {
    setSearch('')
    setSelectedType('')
    setPage(1)
  }

  return (
    <>
      <PageHeader title="Sản phẩm" />

      {/* Toolbar: Tìm kiếm (cao 40px, bo 8px) và Sắp xếp */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="sr-only">Tìm sản phẩm</span>
          <SearchInput
            name="search"
            placeholder="Tìm theo tên, hãng, model..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="[&_input]:h-10 [&_input]:rounded-lg"
          />
        </label>
        <div className="flex items-center gap-2 sm:shrink-0">
          <label htmlFor="catalog-sort" className="text-meta font-medium text-fg-2 whitespace-nowrap">
            Sắp xếp:
          </label>
          <Select
            id="catalog-sort"
            name="sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as typeof sort)
              setPage(1)
            }}
            className="h-10 rounded-lg sm:w-52"
          >
            {PRODUCT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Chip lọc loại sản phẩm trích xuất từ dữ liệu */}
      {knownTypes.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo loại sản phẩm">
          <button
            type="button"
            onClick={() => {
              setSelectedType('')
              setPage(1)
            }}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              !selectedType
                ? 'bg-accent text-on-accent shadow-sm'
                : 'bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg',
            )}
          >
            Tất cả
          </button>
          {knownTypes.map((type) => {
            const isSelected = selectedType.toUpperCase() === type.toUpperCase()
            const label = productTypeLabel(type) ?? type
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setSelectedType(isSelected ? '' : type)
                  setPage(1)
                }}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isSelected
                    ? 'bg-accent text-on-accent shadow-sm'
                    : 'bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* Nội dung danh sách sản phẩm dạng lưới card responsive */}
      <section aria-live="polite" aria-busy={query.isFetching}>
        {query.isError ? (
          <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
        ) : query.isPending ? (
          <CustomerProductGridSkeleton count={6} />
        ) : products.length === 0 ? (
          <CustomerProductEmptyState hasFilters={Boolean(search.trim() || selectedType)} onReset={handleResetFilters} />
        ) : (
          <div className={cx(query.isFetching && 'opacity-70')}>
            <CustomerProductGrid products={products} detailPath={(id) => withId(detailPattern, id)} />
          </div>
        )}
      </section>

      {/* Phân trang: ẩn thanh chuyển trang khi chỉ có 1 trang, chỉ hiển thị dòng đếm số lượng */}
      {!query.isError &&
        !query.isPending &&
        products.length > 0 &&
        (pages > 1 ? (
          <ListPager
            page={page}
            pages={pages}
            from={from}
            to={from + products.length - 1}
            total={query.data?.totalItems ?? products.length}
            noun="sản phẩm"
            onChange={setPage}
          />
        ) : (
          <div className="mt-6 flex items-center justify-between">
            <p className="tnum text-meta text-fg-2">Hiển thị {products.length} sản phẩm</p>
          </div>
        ))}
    </>
  )
}

export function CustomerCatalogPage() {
  return <CatalogPage detailPattern={ROUTES.customer.product} />
}

export function OpsCatalogPage() {
  return <CatalogPage detailPattern={ROUTES.ops.product} />
}

export function TechCatalogPage() {
  return <CatalogPage detailPattern={ROUTES.tech.product} />
}

export function ManageCatalogPage() {
  return <CatalogPage detailPattern={ROUTES.manage.product} />
}
