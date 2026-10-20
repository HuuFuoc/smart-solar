import { useState } from 'react'
import { Pagination } from '@/components/common/ui/pagination'
import { SearchInput, Select } from '@/components/common/ui/field'
import { LANDING_CONTAINER } from '@/features/landing/classes'
import { CatalogError } from '@/features/products/CatalogError'
import { ProductCard } from '@/features/products/ProductCard'
import { PRODUCT_SORT_OPTIONS } from '@/common/product'
import { isProductActive, parseSort } from '@/features/products/productDisplay'
import { useProductsQuery } from '@/hooks/useProducts'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cx } from '@/utils/cx'

/*
 * /products – danh mục sản phẩm công khai, đọc GET /api/products.
 * Chỉ hiện sản phẩm ACTIVE: swagger không có tham số lọc theo trạng thái nên lọc ở client.
 */

const PAGE_SIZE = 12

export function ProductCatalogPage() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(PRODUCT_SORT_OPTIONS[0]!.value)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim())

  const query = useProductsQuery({ Search: debouncedSearch, Page: page, PageSize: PAGE_SIZE, ...parseSort(sort) })
  const products = (query.data?.items ?? []).filter((product) => isProductActive(product.status))
  const pages = query.data?.totalPages ?? 0

  return (
    <div className={cx('pt-12 lg:pt-16', LANDING_CONTAINER)}>
      <header className="max-w-[60ch]">
        <h1 className="ld-h1 text-fg">Sản phẩm</h1>
        <p className="mt-3 ld-lede text-fg-2">Tấm pin, inverter, pin lưu trữ và phụ kiện chúng tôi dùng cho công trình.</p>
      </header>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="sr-only">Tìm sản phẩm</span>
          <SearchInput
            placeholder="Tìm theo tên, hãng, model"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Sắp xếp</span>
          <Select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as typeof sort)
              setPage(1)
            }}
          >
            {PRODUCT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <section aria-live="polite" aria-busy={query.isFetching} className="mt-8">
        {query.isError ? (
          <CatalogError error={query.error} onRetry={() => query.refetch()} />
        ) : query.isPending ? (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Đang tải">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="aspect-[4/5] animate-pulse rounded-container bg-surface-2 motion-reduce:animate-none" />
            ))}
          </ul>
        ) : products.length === 0 ? (
          <div className="rounded-container border border-line px-6 py-10 text-center">
            <p className="ld-body font-semibold text-fg">{debouncedSearch ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào'}</p>
            {debouncedSearch && <p className="mt-2 ld-body text-fg-2">Thử từ khoá khác hoặc xoá ô tìm kiếm.</p>}
          </div>
        ) : (
          <ul className={cx('grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3', query.isFetching && 'opacity-70')}>
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {pages > 1 && !query.isError && (
        <Pagination
          page={page}
          pages={pages}
          onChange={(next) => {
            setPage(next)
            window.scrollTo({ top: 0 })
          }}
          className="mt-8 justify-center"
        />
      )}
    </div>
  )
}
