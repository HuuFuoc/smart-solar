import { Fragment } from 'react'
import { Link } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

export type Crumb = { label: string; href?: string; icon?: string }

export type BreadcrumbProps = {
  items: Crumb[]
  /** Màu mục cuối: on-surface (admin_dashboard) hoặc primary (roles_permissions) */
  activeTone?: 'on-surface' | 'primary'
  className?: string
}

/* Hàng breadcrumb đầu trang: label-md, mũi tên chevron_right 14px. */
export function Breadcrumb({ items, activeTone = 'on-surface', className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Đường dẫn trang"
      className={cn('flex items-center gap-space-2xs text-label-md text-outline', className)}
    >
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1
        const content = (
          <>
            {crumb.icon && <Icon name={crumb.icon} className="text-[16px]" />}
            <span>{crumb.label}</span>
          </>
        )
        return (
          <Fragment key={`${i}-${crumb.label}`}>
            {isLast ? (
              <span
                aria-current="page"
                className={cn(
                  'flex items-center gap-1 font-semibold',
                  activeTone === 'primary' ? 'text-primary' : 'text-on-surface',
                )}
              >
                {content}
              </span>
            ) : crumb.href ? (
              <Link to={crumb.href} className="flex items-center gap-1 transition-colors hover:text-primary">
                {content}
              </Link>
            ) : (
              <span className="flex items-center gap-1">{content}</span>
            )}
            {!isLast && <Icon name="chevron_right" className="text-[14px]" />}
          </Fragment>
        )
      })}
    </nav>
  )
}
