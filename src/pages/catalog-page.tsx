import { useState } from 'react'
import { SearchInput, Select } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { Pagination } from '@/components/common/ui/pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { CatalogTable } from '@/features/products/CatalogTable'
import { PRODUCT_SORT_OPTIONS } from '@/common/product'
import { isProductActive, parseSort } from '@/features/products/productDisplay'
import { useProductsQuery } from '@/hooks/useProducts'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { ROUTES, withId } from '@/routes/paths'
import { cx } from '@/utils/cx'

/*
  Danh mục sản phẩm trong portal khách hàng và kinh doanh, đọc GET /api/products như trang công khai.
  Chỉ hiện sản phẩm đang bán: swagger không có tham số lọc trạng thái nên lọc ở client.
*/

const PAGE_SIZE = 20

function CatalogPage({ detailPattern }: { detailPattern: string }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(PRODUCT_SORT_OPTIONS[0]!.value)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim())

  const query = useProductsQuery({ Search: debouncedSearch, Page: page, PageSize: PAGE_SIZE, ...parseSort(sort) })
  const products = (query.data?.items ?? []).filter((p) => isProductActive(p.status))
  const pages = query.data?.totalPages ?? 0

  return (
    <>
      <PageHeader title="Sản phẩm" />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="sr-only">Tìm sản phẩm</span>
          <SearchInput
            name="search"
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
            name="sort"
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

      <section aria-live="polite" aria-busy={query.isFetching}>
        {query.isError ? (
          <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
        ) : query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title={debouncedSearch ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào đang bán'}
            description={debouncedSearch ? 'Thử từ khoá khác hoặc xoá ô tìm kiếm.' : undefined}
          />
        ) : (
          <div className={cx(query.isFetching && 'opacity-70')}>
            <CatalogTable products={products} detailPath={(id) => withId(detailPattern, id)} />
          </div>
        )}
      </section>

      {pages > 1 && !query.isError && <Pagination page={page} pages={pages} onChange={setPage} className="mt-6" />}
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
