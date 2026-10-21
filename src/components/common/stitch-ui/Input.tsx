import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type InputProps = Omit<ComponentProps<'input'>, 'size'> & {
  /** md 44px, sm 40px, lg 48px */
  size?: 'sm' | 'md' | 'lg'
  /** Icon hoặc chữ ở mép phải trong ô (đơn vị "USD", icon bolt...) */
  trailing?: ReactNode
  /** Đánh dấu lỗi validate: viền đỏ, aria-invalid */
  invalid?: boolean
}

const sizeClasses = {
  sm: 'h-10 px-3',
  md: 'h-11 px-3.5',
  lg: 'h-12 px-space-sm',
} as const

export function Input({ className, size = 'md', trailing, invalid = false, ...rest }: InputProps) {
  const input = (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-xl bg-surface-container-low text-body-md text-on-surface transition-all placeholder:text-outline',
        'focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30',
        'aria-invalid:ring-2 aria-invalid:ring-error/40 disabled:cursor-not-allowed disabled:opacity-50',
        sizeClasses[size],
        trailing ? 'pr-10' : undefined,
        className,
      )}
      {...rest}
    />
  )
  if (!trailing) return input
  return (
    <div className="relative">
      {input}
      <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
        {trailing}
      </span>
    </div>
  )
}
