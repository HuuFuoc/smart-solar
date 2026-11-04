import type { ComponentProps } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

// Trạng thái là chữ, chỉ trạng thái cần chú ý (lỗi, cảnh báo, chờ duyệt) mới có màu. Không nền, chấm chỉ hiện khi truyền `dot`
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

const variantClasses: Record<StatusVariant, { text: string; dot: string }> = {
  submitted: { text: quiet, dot: 'bg-status-submitted-dot' },
  review: { text: 'text-warn', dot: 'bg-status-review-dot' },
  scheduled: { text: quiet, dot: 'bg-status-scheduled-dot' },
  'in-progress': { text: quiet, dot: 'bg-status-in-progress-dot' },
  complete: { text: quiet, dot: 'bg-status-complete-dot' },
  error: { text: 'text-danger', dot: 'bg-error' },
  neutral: { text: quiet, dot: 'bg-outline' },
  primary: { text: quiet, dot: 'bg-primary' },
  warning: { text: 'text-warn', dot: 'bg-secondary-container' },
  success: { text: quiet, dot: 'bg-tertiary-container' },
  active: { text: quiet, dot: 'bg-secondary' },
  positive: { text: quiet, dot: 'bg-tertiary-container' },
  solid: { text: 'text-accent-fg', dot: 'bg-on-primary' },
  ready: { text: quiet, dot: 'bg-primary' },
  pending: { text: 'text-warn', dot: 'bg-status-review-dot' },
}

const sizeClasses = { md: 'py-1', sm: 'py-0.5' } as const

export type StatusBadgeProps = ComponentProps<'span'> & {
  variant?: StatusVariant
  size?: keyof typeof sizeClasses
  /** Chấm 6px trước label */
  dot?: boolean
  /** Chấm nhấp nháy cho trạng thái live */
  pulse?: boolean
  /** Icon Material Symbols thay/thêm cạnh chấm */
  icon?: string
}

export function StatusBadge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  icon,
  className,
  children,
  ...rest
}: StatusBadgeProps) {
  const v = variantClasses[variant]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-label-sm',
        v.text,
        sizeClasses[size],
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
