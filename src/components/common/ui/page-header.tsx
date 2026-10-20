import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '@/utils/cx'

// Nút thao tác căn theo dòng đầu của tiêu đề
export function PageHeader({
  title,
  description,
  meta,
  actions,
  back,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  className?: string
}) {
  return (
    <div className={cx('mb-6 flex flex-wrap items-start justify-between gap-x-8 gap-y-4', className)}>
      <div className="min-w-0 max-w-[64ch]">
        {back && (
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
        <h1 className="text-figure font-semibold">{title}</h1>
        {description && <p className="mt-3 text-body text-fg-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
