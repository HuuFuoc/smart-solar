import type { ComponentProps } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

// Chỉ trạng thái cần chú ý (lỗi, cảnh báo, chờ duyệt) mới có nền màu, còn lại chỉ có chấm màu + chữ
export type StatusVariant =
  | 'submitted'
  | 'review'
  | 'scheduled'
  | 'in-progress'
  | 'complete'
  | 'error'
  | 'neutral'
  | 'primary'
  | 'warning'
  | 'success'
  | 'active'
  | 'positive'
  | 'solid'
  | 'ready'
  | 'pending'

const quiet = 'text-on-surface-variant'

const variantClasses: Record<StatusVariant, { pill: string; dot: string }> = {
  submitted: { pill: quiet, dot: 'bg-status-submitted-dot' },
  review: { pill: 'bg-status-review-bg text-status-review', dot: 'bg-status-review-dot' },
  scheduled: { pill: quiet, dot: 'bg-status-scheduled-dot' },
  'in-progress': { pill: quiet, dot: 'bg-status-in-progress-dot' },
  complete: { pill: quiet, dot: 'bg-status-complete-dot' },
  error: { pill: 'bg-error-container text-on-error-container', dot: 'bg-error' },
  neutral: { pill: quiet, dot: 'bg-outline' },
  primary: { pill: quiet, dot: 'bg-primary' },
  warning: { pill: 'bg-secondary-fixed text-on-secondary-fixed-variant', dot: 'bg-secondary-container' },
  success: { pill: quiet, dot: 'bg-tertiary-container' },
  active: { pill: quiet, dot: 'bg-secondary' },
  positive: { pill: quiet, dot: 'bg-tertiary-container' },
  solid: { pill: 'bg-primary-container text-on-primary', dot: 'bg-on-primary' },
  ready: { pill: quiet, dot: 'bg-primary' },
  pending: { pill: 'bg-status-review-bg text-status-review', dot: 'bg-status-review-dot' },
}

/** Variant có nền màu mới cần padding; loại yên tĩnh chỉ là chữ nên không thụt lề. */
const tinted = new Set<StatusVariant>(['review', 'error', 'warning', 'solid', 'pending'])

const sizeClasses = {
  /** Spec DESIGN.md: py-1 px-3 */
  md: 'px-3 py-1',
  /** Bản gọn hay gặp trong bảng / card */
  sm: 'px-2.5 py-0.5',
} as const

const quietSizeClasses = { md: 'py-1', sm: 'py-0.5' } as const

export type StatusBadgeProps = ComponentProps<'span'> & {
  variant?: StatusVariant
  size?: keyof typeof sizeClasses
  /** Chấm 6px trước label (mặc định có) */
  dot?: boolean
  /** Chấm nhấp nháy cho trạng thái live */
  pulse?: boolean
  /** Icon Material Symbols thay/thêm cạnh chấm */
  icon?: string
}

export function StatusBadge({
  variant = 'neutral',
  size = 'md',
  dot = true,
  pulse = false,
  icon,
  className,
  children,
  ...rest
}: StatusBadgeProps) {
  const v = variantClasses[variant]
  const hasTint = tinted.has(variant)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-label-sm',
        hasTint && 'rounded-lg',
        v.pill,
        hasTint ? sizeClasses[size] : quietSizeClasses[size],
        className,
      )}
      {...rest}
    >
      {dot && <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', v.dot, pulse && 'animate-pulse')} />}
      {icon && <Icon name={icon} className="text-[14px]" />}
      {children}
    </span>
  )
}
