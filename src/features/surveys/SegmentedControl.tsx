import { cn } from '@/utils/cn'

/*
 * Nhóm nút chọn một giá trị.
 * sm = thang mức độ che bóng (None / Light / Moderate / Heavy) trong site_survey_task.
 * md = cặp YES / NO của khối Electrical Infrastructure Check.
 * Màu khi được chọn đặt theo từng option: cảnh báo dùng secondary-container, xác nhận dùng primary-container.
 */
export type SegmentTone = 'neutral' | 'warning' | 'primary'

export type SegmentOption<T extends string> = { value: T; label: string; tone?: SegmentTone }

export type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  /** aria-label của nhóm radio */
  label: string
  className?: string
}

const selectedClasses: Record<SegmentTone, string> = {
  neutral: 'bg-surface-container-highest text-on-surface font-bold',
  warning: 'bg-secondary-container text-on-secondary-container font-bold shadow-sm',
  primary: 'bg-primary-container text-on-primary font-bold shadow-sm',
}

const sizeClasses = {
  sm: 'px-2.5 py-1 text-label-sm',
  md: 'px-4 py-1.5 text-label-md',
} as const

const idleClasses = {
  sm: 'text-on-surface-variant hover:bg-surface-container',
  md: 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
} as const

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex items-center', size === 'sm' ? 'gap-1' : 'gap-space-xs', className)}
    >
      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-tertiary-container/30',
              sizeClasses[size],
              isSelected ? selectedClasses[option.tone ?? 'neutral'] : idleClasses[size],
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
