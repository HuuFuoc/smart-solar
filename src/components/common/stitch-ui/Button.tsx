import type { ComponentProps } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

// Nút theo DESIGN.md: primary / secondary / accent cao 48px; tonal và ghost là nút phụ
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'tonal' | 'ghost' | 'neutral'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-container text-on-primary shadow-sm hover:bg-primary hover:shadow-level-2',
  secondary:
    'border-[1.5px] border-primary-container bg-surface-container-lowest text-primary-container hover:bg-surface-container-low',
  accent: 'bg-secondary-container text-on-secondary shadow-sm hover:bg-secondary',
  tonal: 'bg-surface-container-lowest text-primary shadow-sm hover:bg-surface-container-low',
  ghost: 'bg-surface-container-low text-primary hover:bg-surface-container',
  neutral: 'bg-surface-container text-on-surface hover:bg-surface-container-high',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1 rounded-lg px-space-sm text-label-sm',
  md: 'h-10 gap-space-xs rounded-xl px-space-md text-label-md',
  lg: 'h-12 gap-space-xs rounded-xl px-space-md text-label-lg',
}

const iconSizeClasses: Record<ButtonSize, string> = {
  sm: 'text-[16px]',
  md: 'text-[18px]',
  lg: 'text-[20px]',
}

export function buttonVariants({
  variant = 'primary',
  size = 'lg',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}) {
  return cn(
    'inline-flex items-center justify-center whitespace-nowrap font-bold transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-tertiary-container/30 disabled:pointer-events-none disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )
}

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Tên icon Material Symbols đặt trước label */
  iconLeft?: string
  /** Tên icon Material Symbols đặt sau label */
  iconRight?: string
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'lg',
  iconLeft,
  iconRight,
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className: cn(fullWidth && 'w-full', className) })}
      {...rest}
    >
      {iconLeft && <Icon name={iconLeft} className={iconSizeClasses[size]} />}
      {children}
      {iconRight && <Icon name={iconRight} className={iconSizeClasses[size]} />}
    </button>
  )
}

export type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  icon: string
  /** Bắt buộc: dùng làm aria-label và title */
  label: string
  size?: 'sm' | 'md'
}

/** Nút vuông chỉ có icon, cột action trong bảng, nút zoom/replace trên ảnh... */
export function IconButton({ icon, label, size = 'sm', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-tertiary-container/30 disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} className={size === 'sm' ? 'text-[18px]' : 'text-[20px]'} />
    </button>
  )
}
