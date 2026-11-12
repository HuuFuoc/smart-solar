import type { ReactNode } from 'react'
import { Button } from '@/components/common/ui/button'
import { EmptyState, Skeleton } from '@/components/common/ui/states'
import { CustomerProductCard } from '@/features/products/CustomerProductCard'
import type { ProductResponse } from '@/types/res/adminProductsRes'

export function CustomerProductGrid({
  products,
  detailPath,
}: {
  products: ProductResponse[]
  detailPath: (id: string) => string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <CustomerProductCard key={product.id} product={product} detailPath={detailPath} />
      ))}
    </div>
  )
}

export function CustomerProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Đang tải danh sách sản phẩm">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden className="overflow-hidden rounded-container border border-line">
          <Skeleton className="aspect-4/3 w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-6 w-28" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CustomerProductEmptyState({
  hasFilters,
  onReset,
  emptyTitle = 'Chưa có sản phẩm nào đang bán',
  emptyDescription,
  emptyAction,
}: {
  hasFilters: boolean
  onReset?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
}) {
  return (
    <EmptyState
      title={hasFilters ? 'Không tìm thấy sản phẩm phù hợp' : emptyTitle}
      description={hasFilters ? undefined : emptyDescription}
      action={
        hasFilters && onReset ? (
          <Button variant="secondary" icon="filter_alt_off" onClick={onReset}>
            Xoá bộ lọc
          </Button>
        ) : (
          emptyAction
        )
      }
    />
  )
}
