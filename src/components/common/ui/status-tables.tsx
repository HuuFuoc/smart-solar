import { type ReactNode, useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button } from '@/components/common/ui/button'
import { SearchInput, Select } from '@/components/common/ui/field'
import { cx } from '@/utils/cx'

export type StatusGroupSummary<TGroup extends string> = {
  key: TGroup
  title: string
  count: number
}

type StatusTableSectionProps = {
  title: string
  count: number
  emptyText: string
  highlight?: boolean
  defaultOpen?: boolean
  children: ReactNode
}

/** Khối bảng trạng thái có thể thu gọn, dùng đồng bộ giữa các trang theo dõi của khách hàng. */
export function StatusTableSection({
  title,
  count,
  emptyText,
  highlight = false,
  defaultOpen = true,
  children,
}: StatusTableSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section
      className={cx(
        'overflow-hidden rounded-container border bg-canvas transition-colors',
        highlight ? 'border-accent-line/50 border-l-[3px] border-l-accent' : 'border-line',
      )}
    >
      <div
        className={cx(
          'flex items-center justify-between gap-3 px-4 py-3 sm:px-5',
          highlight ? 'bg-accent-soft/55' : 'bg-surface-2/60',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="group flex min-w-0 items-center gap-2.5 rounded-control py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <h2 className="flex items-center gap-2 text-body font-semibold text-fg transition-colors group-hover:text-accent-fg">
            <span>{title}</span>
            <span
              className={cx(
                'tnum inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[12px] font-semibold',
                count === 0
                  ? 'bg-surface-3 text-fg-2'
                  : highlight
                    ? 'bg-accent text-on-accent'
                    : 'bg-surface-3 text-fg',
              )}
            >
              {count}
            </span>
          </h2>
          <Icon
            name={open ? 'expand_less' : 'expand_more'}
            className="text-[20px] text-fg-2 transition-transform group-hover:text-fg"
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <div className="p-4 pt-2 sm:px-5 sm:pb-4">
          {count === 0 ? <p className="py-5 text-center text-meta text-fg-2">{emptyText}</p> : children}
        </div>
      )}
    </section>
  )
}

type StatusTableFilterBarProps<TGroup extends string, TDate extends string> = {
  searchName: string
  searchLabel: string
  searchPlaceholder: string
  searchValue: string
  onSearchChange: (value: string) => void
  dateLabel: string
  dateValue: TDate
  dateOptions: readonly { value: TDate; label: string }[]
  defaultDateValue: TDate
  onDateChange: (value: TDate) => void
  groups: StatusGroupSummary<TGroup>[]
  totalCount: number
  activeGroup: 'all' | TGroup
  onGroupChange: (group: 'all' | TGroup) => void
  hasFilter: boolean
  onReset: () => void
}

/** Thanh tìm kiếm, lọc theo ngày, đặt lại bộ lọc và tab chọn nhanh bảng trạng thái. */
export function StatusTableFilterBar<TGroup extends string, TDate extends string>({
  searchName,
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  dateLabel,
  dateValue,
  dateOptions,
  defaultDateValue,
  onDateChange,
  groups,
  totalCount,
  activeGroup,
  onGroupChange,
  hasFilter,
  onReset,
}: StatusTableFilterBarProps<TGroup, TDate>) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{searchLabel}</span>
          <SearchInput
            name={searchName}
            placeholder={searchPlaceholder}
            maxLength={100}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <label className="w-full sm:w-44">
            <span className="sr-only">{dateLabel}</span>
            <Select
              aria-label={dateLabel}
              active={dateValue !== defaultDateValue}
              value={dateValue}
              onChange={(e) => onDateChange(e.target.value as TDate)}
            >
              {dateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </label>

          {hasFilter && (
            <Button size="md" variant="secondary" icon="close" onClick={onReset}>
              Xoá lọc
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo bảng trạng thái">
        <button
          type="button"
          onClick={() => onGroupChange('all')}
          aria-pressed={activeGroup === 'all'}
          className={cx(
            'tnum inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            activeGroup === 'all'
              ? 'bg-accent text-on-accent'
              : 'border border-line bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg',
          )}
        >
          Tất cả ({totalCount})
        </button>

        {groups.map((g) => {
          const selected = activeGroup === g.key
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => onGroupChange(selected ? 'all' : g.key)}
              aria-pressed={selected}
              className={cx(
                'tnum inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-meta font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                selected
                  ? 'bg-accent text-on-accent'
                  : 'border border-line bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg',
              )}
            >
              <span>{g.title}</span>
              <span
                className={cx(
                  'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-semibold',
                  selected ? 'bg-canvas/20 text-on-accent' : 'bg-surface-3 text-fg-2',
                )}
              >
                {g.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

