import type { ComponentProps } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

export type CardProps = ComponentProps<'div'> & {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Thêm shadow Level 2 khi hover (card bấm được) */
  interactive?: boolean
}

const paddingClasses = {
  none: '',
  sm: 'p-space-sm',
  md: 'p-space-md',
  lg: 'p-space-lg',
} as const

/** Card theo DESIGN.md: nền trắng, viền mảnh */
export function Card({ padding = 'lg', interactive = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-outline-card bg-surface-container-lowest shadow-level-1',
        interactive && 'transition-shadow hover:shadow-level-2',
        paddingClasses[padding],
        className,
      )}
      {...rest}
    />
  )
}

/** Hàng đầu card: tiêu đề bên trái, action/badge bên phải. */
export function CardHeader({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex items-center justify-between gap-space-sm', className)} {...rest} />
}

export type CardTitleProps = ComponentProps<'h3'> & {
  /** Icon Material Symbols màu primary trước tiêu đề */
  icon?: string
}

export function CardTitle({ icon, className, children, ...rest }: CardTitleProps) {
  return (
    <h3 className={cn('flex items-center gap-space-xs text-headline-md text-on-surface', className)} {...rest}>
      {icon && <Icon name={icon} className="text-[20px] text-primary" />}
      {children}
    </h3>
  )
}

export function CardDescription({ className, ...rest }: ComponentProps<'p'>) {
  return <p className={cn('text-body-sm text-on-surface-variant', className)} {...rest} />
}
