import { type ReactNode, useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Count } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { SearchInput, Select } from '@/components/common/ui/field'

export type StatusGroupSummary<TGroup extends string> = {
  key: TGroup
  title: string
  count: number
  /** Nhóm có việc người xem phải làm: số đếm đỏ */
  attention?: boolean
}

type StatusTableSectionProps = {
  title: string
  count: number
  emptyText: string
  highlight?: boolean
  defaultOpen?: boolean
  children: ReactNode
}

// Một nhóm trạng thái thu gọn được: tiêu đề nói nhóm chứa gì, số đỏ khi nhóm có việc phải làm
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
    <section className="overflow-hidden rounded-container border border-line bg-canvas">
      <h2 className="bg-surface-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="press flex w-full items-center gap-2 px-4 py-2 text-left text-body font-semibold text-fg hover:bg-hover"
        >
          {title}
          <Count value={count} attention={highlight && count > 0} />
          <Icon name={open ? 'expand_less' : 'expand_more'} className="ml-auto text-[20px] text-fg-2" aria-hidden />
        </button>
      </h2>

      {open && (
        <div className="border-t border-line px-4 pb-2">
          {count === 0 ? <p className="py-3 text-meta text-fg-2">{emptyText}</p> : children}
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

// Tìm, lọc theo ngày, rồi tab chọn nhóm trạng thái
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
        <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
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
            <Button variant="secondary" icon="close" onClick={onReset}>
              Xoá lọc
            </Button>
          )}
        </div>
      </div>

      <FilterChips
        label="Lọc theo trạng thái"
        value={activeGroup}
        onChange={onGroupChange}
        chips={[
          { value: 'all' as const, label: 'Tất cả', count: totalCount },
          ...groups.map((g) => ({ value: g.key, label: g.title, count: g.count, attention: g.attention })),
        ]}
      />
    </div>
  )
}
