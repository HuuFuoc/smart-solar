import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type ProgressRingProps = {
  /** 0-100 */
  value: number
  /** Đường kính px */
  size?: number
  strokeWidth?: number
  /** Class màu (currentColor) cho vòng nền và vòng giá trị */
  trackClassName?: string
  indicatorClassName?: string
  /** Nội dung ở tâm (icon, số %) */
  children?: ReactNode
  label?: string
  className?: string
}

// Vòng tiến độ SVG, chu vi 100 đơn vị
const RING_PATH = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831'

export function ProgressRing({
  value,
  size = 56,
  strokeWidth = 3.5,
  trackClassName = 'text-surface-container-highest',
  indicatorClassName = 'text-primary-container',
  children,
  label,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="img"
      aria-label={label ?? `${clamped}%`}
      className={cn('relative flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 36 36" width={size} height={size} className="-rotate-90">
        <path d={RING_PATH} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={trackClassName} />
        <path
          d={RING_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${clamped}, 100`}
          className={cn('transition-all duration-500', indicatorClassName)}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}
