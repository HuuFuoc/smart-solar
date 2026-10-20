import { Count } from '@/components/common/ui/badge'
import { cx } from '@/utils/cx'

/** `attention`: số đếm là việc đang chờ người xem, tô đỏ (xem Count). */
export type Chip<T extends string> = { value: T; label: string; count?: number; attention?: boolean }

// Bộ lọc dạng tab gạch chân, cuộn ngang thay vì xuống dòng
export function FilterChips<T extends string>({
  chips,
  value,
  onChange,
  label,
  className,
}: {
  chips: Chip<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx(
        'scroll-x flex gap-x-6 shadow-[inset_0_-1px_0_var(--color-line)] [scrollbar-width:none]',
        className,
      )}
    >
      {chips.map((c) => {
        const active = c.value === value
        return (
          <button
            key={c.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(c.value)}
            className={cx(
              'press inline-flex h-11 shrink-0 items-center gap-2 border-b-2 text-body whitespace-nowrap focus-visible:outline-offset-[-2px] lg:h-10',
              active
                ? 'border-accent font-semibold text-fg'
                : 'border-transparent text-fg-2 hover:border-line-2 hover:text-fg',
            )}
          >
            {c.label}
            {c.count !== undefined && <Count value={c.count} attention={c.attention && c.count > 0} />}
          </button>
        )
      })}
    </div>
  )
}
