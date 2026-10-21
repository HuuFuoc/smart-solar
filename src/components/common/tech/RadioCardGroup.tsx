import { useId } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

// Nhóm radio dạng thẻ. stacked: nhãn + mô tả, inline: thẻ gọn, card: không hiện ô tròn
export type RadioCardOption<T extends string> = { value: T; label: string; description?: string }

export type RadioCardGroupProps<T extends string> = {
  /** Tên nhóm radio, cũng là aria-label của fieldset */
  name: string
  label: string
  options: RadioCardOption<T>[]
  value: T
  onChange: (value: T) => void
  layout?: 'stacked' | 'inline' | 'card'
  columns?: 2 | 3
  invalid?: boolean
  className?: string
}

const columnClasses = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' } as const

export function RadioCardGroup<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  layout = 'stacked',
  columns = 3,
  invalid = false,
  className,
}: RadioCardGroupProps<T>) {
  const groupId = useId()
  const isInline = layout === 'inline'
  const isCard = layout === 'card'

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      className={cn(
        'grid',
        isCard ? 'gap-space-sm' : 'gap-space-xs',
        isInline ? 'grid-cols-3' : cn('grid-cols-1', columnClasses[columns]),
        className,
      )}
    >
      {options.map((option) => {
        const inputId = `${groupId}-${option.value}`
        const isSelected = option.value === value

        if (isCard) {
          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={cn(
                'flex cursor-pointer flex-col gap-1 rounded-xl p-space-sm transition-all',
                isSelected
                  ? 'bg-primary-container text-on-primary shadow-sm ring-2 ring-primary'
                  : 'bg-surface-container-low hover:bg-surface-container-high',
                invalid && !isSelected && 'ring-1 ring-error/50',
              )}
            >
              <input
                id={inputId}
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="flex items-center justify-between gap-space-xs">
                <span className={cn('text-label-md font-bold', isSelected ? 'text-on-primary' : 'text-on-surface')}>
                  {option.label}
                </span>
                {isSelected && <Icon name="check_circle" className="text-[16px] text-on-primary" />}
              </span>
              {option.description && (
                <span
                  className={cn('text-body-sm', isSelected ? 'text-on-primary-container' : 'text-on-surface-variant')}
                >
                  {option.description}
                </span>
              )}
            </label>
          )
        }

        return (
          <label
            key={option.value}
            htmlFor={inputId}
            className={cn(
              'flex cursor-pointer items-center rounded-xl bg-surface-container-low transition-colors hover:bg-surface-container',
              isInline
                ? cn(
                    'justify-center gap-1.5 px-space-xs py-2.5 text-label-md',
                    isSelected ? 'font-bold text-primary-container' : 'font-medium text-on-surface-variant',
                  )
                : 'gap-2 p-3',
              invalid && 'ring-1 ring-error/50',
            )}
          >
            <input
              id={inputId}
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
            />
            {isInline ? (
              <span>{option.label}</span>
            ) : (
              <span className="flex flex-col">
                <span className="text-label-md font-semibold text-on-surface">{option.label}</span>
                {option.description && (
                  <span className="text-body-sm text-on-surface-variant">{option.description}</span>
                )}
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}
