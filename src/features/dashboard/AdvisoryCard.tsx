import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/* "Maintenance Advisory" trong admin_dashboard: thẻ cảnh báo nền surface-container. */
export type AdvisoryCardProps = {
  /** Giữ trong dữ liệu; thẻ hiện không vẽ ô icon. */
  icon?: string
  eyebrow: string
  title: string
  /** Nội dung, có thể chứa <strong> */
  children: ReactNode
  reference?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function AdvisoryCard({
  eyebrow,
  title,
  children,
  reference,
  actionLabel,
  onAction,
  className,
}: AdvisoryCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-space-lg',
        className,
      )}
    >
      <div>
        <span className="text-label-sm text-on-surface-variant">{eyebrow}</span>
        <h4 className="mt-0.5 text-body-lg font-semibold text-on-surface">{title}</h4>
        <p className="mt-1 text-body-sm text-on-surface-variant">{children}</p>
      </div>
      {(reference || actionLabel) && (
        <div className="mt-space-md flex flex-wrap items-center justify-between gap-space-xs pt-space-xs">
          {reference && <span className="text-label-sm text-outline">{reference}</span>}
          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="whitespace-nowrap rounded-lg bg-surface-container-lowest px-3 py-1.5 text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-bright"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
