import type { ComponentProps, ReactNode } from 'react'
import { Card } from '@/components/common/stitch-ui/Card'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { cn } from '@/utils/cn'

// Thanh lọc: ô tìm, select và chip

export type SearchInputProps = Omit<ComponentProps<'input'>, 'size' | 'type'> & {
  size?: 'md' | 'lg'
  /** Gợi ý phím tắt góc phải, ví dụ "Ctrl K" */
  shortcutHint?: string
}

export function SearchInput({ size = 'lg', shortcutHint, className, ...rest }: SearchInputProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline" />
      <input
        type="search"
        className={cn(
          'w-full rounded-xl bg-surface-container-low pl-11 text-body-md text-on-surface transition-all placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20',
          size === 'lg' ? 'h-12' : 'h-11',
          shortcutHint ? 'pr-16' : 'pr-4',
        )}
        {...rest}
      />
      {shortcutHint && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-surface-container px-1.5 py-0.5 text-label-sm text-outline">
          {shortcutHint}
        </span>
      )}
    </div>
  )
}

export type SelectOption = { value: string; label: string }

export type SelectProps = Omit<ComponentProps<'select'>, 'size'> & {
  options: SelectOption[]
  size?: keyof typeof selectSizeClasses
}

const selectSizeClasses = {
  sm: 'h-8 rounded-lg pl-2 pr-7 text-label-sm',
  /** panel chi tiết product_catalogue: 40px, chữ body-md */
  compact: 'h-10 rounded-xl pl-3 pr-8 text-body-md',
  md: 'h-11 rounded-xl pl-3.5 pr-8 text-label-md',
  lg: 'h-12 rounded-xl pl-3.5 pr-8 text-label-md',
} as const

export function Select({ options, size = 'lg', className, ...rest }: SelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        className={cn(
          'w-full cursor-pointer appearance-none bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20',
          selectSizeClasses[size],
        )}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="expand_more"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline"
      />
    </div>
  )
}

export type FilterChipProps = Omit<ComponentProps<'button'>, 'children'> & {
  label: string
  active?: boolean
  count?: number
  icon?: string
  /** Màu icon, ví dụ "text-secondary" */
  iconClassName?: string
  /** pill = nhóm thời gian (Today/Upcoming); rounded = chip loại / ưu tiên */
  shape?: 'pill' | 'rounded'
  tone?: 'default' | 'error'
}

export function FilterChip({
  label,
  active = false,
  count,
  icon,
  iconClassName,
  shape = 'rounded',
  tone = 'default',
  className,
  type = 'button',
  ...rest
}: FilterChipProps) {
  const isPill = shape === 'pill'
  const activeClasses =
    tone === 'error'
      ? 'bg-error-container font-bold text-on-error-container'
      : isPill
        ? 'bg-primary-container text-on-primary shadow-sm'
        : 'bg-surface-container-high font-bold text-on-surface'
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 whitespace-nowrap text-label-sm transition-colors',
        isPill ? 'rounded-full px-space-md py-1.5' : 'rounded-lg px-space-sm py-1',
        active ? activeClasses : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} className={cn('text-[16px]', iconClassName)} />}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 font-bold',
            active && isPill ? 'bg-surface-container-lowest/20' : 'bg-surface-container-highest text-on-surface',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

export type ActiveScope = { key: string; label: string; onRemove?: () => void }

export type FilterBarProps = {
  /** Hàng chip trên cùng (Today / Upcoming / ...) */
  chips?: ReactNode
  search?: SearchInputProps
  selects?: (SelectProps & { key: string })[]
  /** Chip lọc đang áp dụng + nút reset */
  scopes?: { label?: string; items: ActiveScope[]; onReset?: () => void }
  /** Slot phải của hàng scopes (bulk actions...) */
  trailing?: ReactNode
  className?: string
}

export function FilterBar({ chips, search, selects, scopes, trailing, className }: FilterBarProps) {
  return (
    <Card padding="md" className={cn('flex flex-col gap-space-md', className)}>
      {chips && <div className="flex flex-wrap items-center justify-between gap-space-sm">{chips}</div>}

      {(search || (selects && selects.length > 0)) && (
        <div className="flex flex-col items-stretch gap-space-sm lg:flex-row lg:items-center">
          {search && <SearchInput {...search} className={cn('flex-1', search.className)} />}
          {selects && selects.length > 0 && (
            <div className="flex flex-wrap items-center gap-space-xs sm:flex-nowrap">
              {selects.map(({ key, className: selectClassName, ...select }) => (
                <Select key={key} {...select} className={cn('min-w-[150px]', selectClassName)} />
              ))}
            </div>
          )}
        </div>
      )}

      {(scopes || trailing) && (
        <div className="flex flex-col justify-between gap-space-xs rounded-xl bg-surface-container-low/40 px-space-sm py-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-space-xs">
            {scopes?.label && <span className="text-label-sm font-semibold text-outline">{scopes.label}</span>}
            {scopes?.items.map((scope) => (
              <span
                key={scope.key}
                className="inline-flex items-center gap-1 rounded-lg bg-surface-container-high px-2.5 py-1 text-label-sm text-on-surface"
              >
                <span>{scope.label}</span>
                {scope.onRemove && (
                  <button
                    type="button"
                    aria-label={`Bỏ ${scope.label}`}
                    onClick={scope.onRemove}
                    className="flex items-center hover:text-error"
                  >
                    <Icon name="close" className="text-[14px]" />
                  </button>
                )}
              </span>
            ))}
            {scopes?.onReset && (
              <button
                type="button"
                onClick={scopes.onReset}
                className="ml-1 text-label-sm text-primary hover:underline"
              >
                Xoá bộ lọc
              </button>
            )}
          </div>
          {trailing && <div className="flex items-center gap-space-xs">{trailing}</div>}
        </div>
      )}
    </Card>
  )
}
