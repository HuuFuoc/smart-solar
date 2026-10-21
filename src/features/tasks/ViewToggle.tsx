import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

/* Nút chuyển chế độ xem "List Matrix / Bento Cards" ở đầu my_tasks_1. */
export type ViewOption<T extends string> = { value: T; label: string; icon: string }

export type ViewToggleProps<T extends string> = {
  options: ViewOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Nhãn cho nhóm nút (screen reader) */
  label: string
  className?: string
}

export function ViewToggle<T extends string>({ options, value, onChange, label, className }: ViewToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex items-center rounded-xl bg-surface-container-low p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center gap-space-2xs rounded-lg px-space-sm py-1.5 text-label-sm transition-all',
              active
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <Icon name={option.icon} className="text-[18px]" />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
