import type { ReactNode } from 'react'
import { Breadcrumb, type Crumb } from '@/components/common/stitch-ui/Breadcrumb'
import { cn } from '@/utils/cn'

export type { Crumb } from '@/components/common/stitch-ui/Breadcrumb'

export type PageHeaderProps = {
  breadcrumb?: Crumb[]
  /** Góc phải hàng breadcrumb: trạng thái cluster, sync... */
  meta?: ReactNode
  /** Chuỗi = nhãn nhỏ phía trên tiêu đề; node = hàng badge (user_management) */
  eyebrow?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  /** Khoảng cách dưới header, mặc định lg */
  bottomSpacing?: 'none' | 'lg' | 'xl' | '2xl'
  titleClassName?: string
  className?: string
}

const bottomSpacingClasses = { none: '', lg: 'mb-space-lg', xl: 'mb-space-xl', '2xl': 'mb-space-2xl' } as const

export function PageHeader({
  breadcrumb,
  meta,
  eyebrow,
  title,
  description,
  actions,
  bottomSpacing = 'lg',
  titleClassName,
  className,
}: PageHeaderProps) {
  return (
    <div className={className}>
      {(breadcrumb || meta) && (
        <div className="mb-space-md flex flex-wrap items-center justify-between gap-space-sm">
          {breadcrumb && <Breadcrumb items={breadcrumb} />}
          {meta && <div className="flex items-center gap-space-xs text-label-sm text-on-surface-variant">{meta}</div>}
        </div>
      )}

      <div
        className={cn(
          // Nút thao tác đứng cùng hàng tiêu đề khi đủ chỗ, tự xuống dòng khi hẹp.
          'flex flex-wrap items-end justify-between gap-x-space-lg gap-y-space-sm',
          bottomSpacingClasses[bottomSpacing],
        )}
      >
        <div>
          {typeof eyebrow === 'string' ? (
            <p className="mb-space-2xs text-label-sm text-on-surface-variant">{eyebrow}</p>
          ) : (
            eyebrow && <div className="mb-1 flex flex-wrap items-center gap-space-xs">{eyebrow}</div>
          )}
          <h1 className={cn('text-headline-lg tracking-tight text-on-surface', titleClassName)}>{title}</h1>
          {description && <p className="mt-1 text-body-md text-on-surface-variant">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-space-sm">{actions}</div>}
      </div>
    </div>
  )
}
