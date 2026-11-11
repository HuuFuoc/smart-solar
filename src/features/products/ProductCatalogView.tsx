import { useId, useState, type ReactNode } from 'react'
import { PRODUCT_SORT_OPTIONS } from '@/common/product'
import { SearchInput, Select } from '@/components/common/ui/field'
import { ListPager } from '@/components/common/ui/pagination'
import { ErrorState } from '@/components/common/ui/states'
import {
  CustomerProductEmptyState,
  CustomerProductGrid,
  CustomerProductGridSkeleton,
} from '@/features/products/CustomerProductGrid'
import { isProductActive, parseSort, productTypeLabel } from '@/features/products/productDisplay'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useProductsQuery } from '@/hooks/useProducts'
import type { ApiError } from '@/services/api/errors'
import { withId } from '@/routes/paths'
import { cx } from '@/utils/cx'

const PAGE_SIZE = 12

/** Khối danh sách sản phẩm dùng chung (toolbar, chip lọc loại, lưới card 3 cột, skeleton, phân trang). */
export function ProductCatalogView({
  detailPattern,
  renderError,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className,
}: {
  detailPattern: string
  renderError?: (error: ApiError, onRetry: () => void) => ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  className?: string
}) {
  const sortId = useId()
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

  // Tích lũy danh sách loại sản phẩm thực tế từ dữ liệu tải về để giữ nguyên thanh chip khi lọc
  const [prevItems, setPrevItems] = useState(query.data?.items)
  if (query.data?.items !== prevItems) {
    setPrevItems(query.data?.items)
    const types = (query.data?.items ?? [])
      .map((p) => p.productType?.trim())
      .filter((t): t is string => Boolean(t))
    const merged = Array.from(new Set([...knownTypes, ...types]))
    if (merged.length > knownTypes.length) {
      setKnownTypes(merged)
    }
  }

  const activeProducts = (query.data?.items ?? []).filter((p) => isProductActive(p.status))
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
    <div className={className}>
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
          <label htmlFor={sortId} className="text-meta font-medium text-fg-2 whitespace-nowrap">
            Sắp xếp:
          </label>
          <Select
            id={sortId}
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
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
          renderError ? (
            renderError(query.error, () => query.refetch())
          ) : (
            <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
          )
        ) : query.isPending ? (
          <CustomerProductGridSkeleton count={6} />
        ) : products.length === 0 ? (
          <CustomerProductEmptyState
            hasFilters={Boolean(search.trim() || selectedType)}
            onReset={handleResetFilters}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            emptyAction={emptyAction}
          />
        ) : (
          <div className={cx(query.isFetching && 'opacity-70')}>
            <CustomerProductGrid
              products={products}
              detailPath={(id) => withId(detailPattern, id)}
            />
          </div>
        )}
      </section>

      {/* Phân trang: ẩn thanh chuyển trang khi chỉ có 1 trang, chỉ hiển thị dòng đếm số lượng */}
      {!query.isError && !query.isPending && products.length > 0 && (
        pages > 1 ? (
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
            <p className="tnum text-meta text-fg-2">
              Hiển thị {products.length} sản phẩm
            </p>
          </div>
        )
      )}
    </div>
  )
}

