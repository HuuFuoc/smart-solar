import { Skeleton } from '@/components/common/ui/states'

export function CustomerProductDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải thông tin sản phẩm">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded" />
        <span className="text-fg-3/40">/</span>
        <Skeleton className="h-4 w-48 rounded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Cột ảnh 5/12 */}
        <div className="lg:col-span-5 space-y-3">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="size-16 rounded-lg" />
            <Skeleton className="size-16 rounded-lg" />
            <Skeleton className="size-16 rounded-lg" />
          </div>
        </div>

        {/* Cột thông tin 7/12 */}
        <div className="lg:col-span-7 flex flex-col space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-32 rounded" />
            <Skeleton className="h-7 w-4/5 rounded" />
          </div>

          {/* Khung giá */}
          <div className="rounded-xl border border-line bg-surface-2/40 p-4 space-y-2">
            <Skeleton className="h-8 w-44 rounded" />
            <Skeleton className="h-3.5 w-64 rounded" />
          </div>

          {/* Nút CTA */}
          <Skeleton className="h-11 w-full rounded-lg" />

          {/* Highlights 4 ô */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>

          {/* Khung bảng thông số */}
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

