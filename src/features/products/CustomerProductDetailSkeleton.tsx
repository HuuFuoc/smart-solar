import { Skeleton } from '@/components/common/ui/states'

export function CustomerProductDetailSkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-12" aria-busy="true" aria-label="Đang tải thông tin sản phẩm">
      <Skeleton className="aspect-4/3 w-full lg:col-span-5" />
      <div className="space-y-4 lg:col-span-7">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  )
}
