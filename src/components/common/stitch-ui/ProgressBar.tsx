import { cn } from '@/utils/cn'

export type ProgressBarProps = {
  /** 0-100 */
  value: number
  tone?: 'primary' | 'secondary' | 'error'
  size?: 'sm' | 'md'
  /** aria-label cho screen reader */
  label?: string
  className?: string
}

const toneClasses = {
  primary: 'bg-primary-container',
  secondary: 'bg-secondary-container',
  error: 'bg-error',
} as const

export function ProgressBar({ value, tone = 'primary', size = 'md', label, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        'w-full overflow-hidden rounded-full bg-surface-container-highest',
        size === 'md' ? 'h-2.5' : 'h-1.5',
        className,
      )}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', toneClasses[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
