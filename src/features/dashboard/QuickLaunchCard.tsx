import { Link } from 'react-router'
import { cn } from '@/utils/cn'

/* "Governance Quick Launchpads" trong admin_dashboard: nav phụ dạng thẻ bấm được. */
export type QuickLaunchTone = 'primary' | 'secondary' | 'primary-container' | 'tertiary'

/*
  Cả app chỉ còn một màu nhấn nên 4 tone không còn khác nhau về màu; giữ kiểu
  prop để dữ liệu cũ không phải sửa.
*/
const ctaClasses = 'text-primary'
const titleHoverClasses = 'group-hover:text-primary'

export type QuickLaunchCardProps = {
  /** Giữ trong dữ liệu để dùng lại nếu cần; thẻ hiện không vẽ ô icon. */
  icon?: string
  /** Giữ để tương thích dữ liệu; màu nhấn nay dùng chung. */
  tone?: QuickLaunchTone
  title: string
  description?: string
  ctaLabel: string
  href: string
  className?: string
}

export function QuickLaunchCard({
  title,
  description,
  ctaLabel,
  href,
  className,
}: QuickLaunchCardProps) {
  return (
    <Link
      to={href}
      className={cn(
        'group flex flex-col justify-between rounded-xl border border-outline-card bg-surface-container-lowest p-space-lg transition-colors hover:border-outline',
        className,
      )}
    >
      <div>
        <h3 className={cn('text-body-lg font-semibold text-on-surface transition-colors', titleHoverClasses)}>{title}</h3>
        {description && <p className="mt-1 text-body-sm text-on-surface-variant">{description}</p>}
      </div>
      <span className={cn('mt-space-lg text-label-md font-semibold', ctaClasses)}>{ctaLabel}</span>
    </Link>
  )
}
