import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

/*
 * Lưới thẻ chọn có icon lớn + nhãn + mô tả ngắn ("Roof Surface Profile" trong site_survey_task).
 * Thẻ được chọn tô primary-container.
 */
export type ChoiceCardOption = { value: string; label: string; icon: string; caption?: string }

export type ChoiceCardGroupProps = {
  options: ChoiceCardOption[]
  value: string
  onChange: (value: string) => void
  /** aria-label của nhóm radio */
  label: string
  columns?: 3 | 4
  className?: string
}

const columnClasses = { 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' } as const

export function ChoiceCardGroup({
  options,
  value,
  onChange,
  label,
  columns = 4,
  className,
}: ChoiceCardGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid grid-cols-2 gap-space-xs', columnClasses[columns], className)}
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
              'flex flex-col items-center justify-center rounded-xl p-space-sm transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-tertiary-container/30',
              isSelected
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high',
            )}
          >
            <Icon name={option.icon} className="text-[24px]" />
            <span className="mt-1 text-label-md font-bold">{option.label}</span>
            {option.caption && (
              <span className={cn('text-label-sm', isSelected ? 'opacity-80' : 'text-on-surface-variant')}>
                {option.caption}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
