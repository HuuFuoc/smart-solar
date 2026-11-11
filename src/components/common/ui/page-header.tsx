import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '@/utils/cx'

export type BreadcrumbItem = { label: string; to?: string }

// Nút thao tác căn theo dòng đầu của tiêu đề
export function PageHeader({
  title,
  titleBadge,
  subtitle,
  description,
  meta,
  actions,
  back,
  breadcrumb,
  className,
}: {
  title: ReactNode
  titleBadge?: ReactNode
  subtitle?: ReactNode
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  breadcrumb?: BreadcrumbItem[]
  className?: string
}) {
  return (
    <div className={cx('mb-4 space-y-3', className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1.5 text-meta text-fg-2">
          {breadcrumb.map((item, index) => {
            const isLast = index === breadcrumb.length - 1
            return (
              <Fragment key={`${index}-${item.label}`}>
                {index > 0 && (
                  <span aria-hidden className="text-fg-3 select-none">
                    /
                  </span>
                )}
                {isLast || !item.to ? (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cx('truncate', isLast && 'font-medium text-fg')}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.to}
                    className="rounded-control px-1 py-0.5 -ml-1 font-medium text-fg-2 transition-colors hover:bg-hover hover:text-accent-fg"
                  >
                    {item.label}
                  </Link>
                )}
              </Fragment>
            )
          })}
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div className="min-w-0 flex-1 max-w-[68ch]">
          {back && !breadcrumb && (
            <div className="mb-3">
              <Link
                to={back.to}
                className="tap text-meta text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg hover:decoration-fg"
              >
                {back.label}
              </Link>
            </div>
          )}
          {meta && <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-fg-2">{meta}</div>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-figure font-semibold text-fg">{title}</h1>
            {titleBadge}
          </div>
          {subtitle && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-fg-2">{subtitle}</div>
          )}
          {description && <p className="mt-1.5 text-body text-fg-2">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  )
}
