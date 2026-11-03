import type { ReactNode } from 'react'
import { cx } from '@/utils/cx'
import { Button } from '@/components/common/ui/button'
import { Icon } from '@/components/common/stitch-ui/Icon'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse rounded-control bg-surface-3', className)} />
}

/* Placeholder that matches the shape of a typical page: header, a stat row and two panels. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('rounded-container border border-dashed border-line-2 px-6 py-8 text-center', className)}>
      <p className="text-body font-medium text-fg">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-[46ch] text-body text-fg-2">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Không tải được trang này.',
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="flex gap-3 rounded-container bg-danger-soft px-4 py-3">
      <Icon name="error" className="mt-px shrink-0 text-[20px] text-danger" />
      <div className="min-w-0">
        <p className="text-body font-semibold text-danger">{title}</p>
        {message && <p className="mt-1 text-body text-fg-2">{message}</p>}
        {onRetry && (
          <Button variant="secondary" size="sm" icon="refresh" className="mt-3" onClick={onRetry}>
            Thử lại
          </Button>
        )}
      </div>
    </div>
  )
}
