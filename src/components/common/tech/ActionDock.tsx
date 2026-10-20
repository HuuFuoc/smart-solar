import type { ReactNode } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

// Thanh hành động dính đáy màn hình. Biến thể `pulse` dùng chấm nhấp nháy thay icon
export type ActionDockProps = {
  /** Bỏ trống khi dùng `pulse` */
  icon?: string
  /** Chấm trạng thái thay cho ô icon */
  pulse?: boolean
  title?: string
  description?: string
  /** Thay cả khối trái (site_survey_verification dùng nút upload ảnh thay cho icon + tiến độ) */
  leading?: ReactNode
  children: ReactNode
  className?: string
}

export function ActionDock({ icon, pulse = false, title, description, leading, children, className }: ActionDockProps) {
  if (leading) {
    return (
      <div className={cn('sticky bottom-4 z-30 mt-space-md w-full', className)}>
        <div className="flex w-full flex-col items-center justify-between gap-space-md rounded-2xl bg-surface-container-lowest/95 p-space-md shadow-level-3 backdrop-blur-xl md:flex-row">
          <div className="flex w-full items-center gap-space-md md:w-auto">{leading}</div>
          <div className="flex w-full items-center justify-end gap-space-sm md:w-auto">{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('sticky bottom-4 z-30 mt-space-md w-full', className)}>
      <div className="flex w-full flex-col items-center justify-between gap-space-md rounded-2xl bg-surface-container-lowest/95 p-space-md shadow-level-3 backdrop-blur-xl sm:flex-row">
        <div className="flex items-center gap-space-sm">
          {pulse ? (
            <span aria-hidden="true" className="ml-1 h-3 w-3 shrink-0 rounded-full bg-status-in-progress-dot" />
          ) : (
            icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name={icon} className="text-[24px]" />
              </div>
            )
          )}
          <div className="flex flex-col">
            <span className="text-label-md font-bold text-on-surface">{title}</span>
            {description && <span className="text-body-sm text-on-surface-variant">{description}</span>}
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-space-xs sm:w-auto">{children}</div>
      </div>
    </div>
  )
}
