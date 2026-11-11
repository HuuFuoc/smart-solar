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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {products.map((product) => (
        <CustomerProductCard key={product.id} product={product} detailPath={detailPath} />
      ))}
    </div>
  )
}

export function CustomerProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-label="Đang tải danh sách sản phẩm">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex flex-col h-full rounded-xl border border-line bg-canvas overflow-hidden"
          aria-hidden="true"
        >
          <div className="aspect-[4/3] w-full bg-surface-2 animate-pulse" />
          <div className="flex flex-1 flex-col p-4 gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4.5 w-full mt-0.5" />
            <Skeleton className="h-4.5 w-4/5" />
            <div className="flex gap-2 pt-1.5">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-32 mt-1" />
            <div className="mt-auto pt-3 border-t border-line/60 flex items-baseline gap-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-3.5 w-10" />
            </div>
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
  emptyDescription = 'Hiện tại hệ thống chưa có sản phẩm nào trong danh mục.',
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
      description={
        hasFilters
          ? 'Không có sản phẩm nào khớp với tìm kiếm hoặc bộ lọc hiện tại của bạn.'
          : emptyDescription
      }
      action={
        hasFilters && onReset ? (
          <Button variant="secondary" onClick={onReset} className="mt-2">
            Xóa bộ lọc
          </Button>
        ) : (
          emptyAction
        )
      }
    />
  )
}

