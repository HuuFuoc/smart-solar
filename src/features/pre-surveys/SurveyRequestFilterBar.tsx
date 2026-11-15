import { Button } from '@/components/common/ui/button'
import { SearchInput, Select } from '@/components/common/ui/field'
import { DATE_FILTER_OPTIONS, type DateFilter } from '@/features/scheduling/schedulingDisplay'

export type GroupOption<T extends string> = { value: T; label: string; count: number }

type SurveyRequestFilterBarProps<TGroup extends string> = {
  search: string
  onSearchChange: (value: string) => void
  /** Nhãn cho trình đọc màn hình: ngày lọc là ngày khách gửi (Chờ nhận) hay ngày bạn nhận (Của tôi) */
  dateLabel: string
  dateValue: DateFilter
  onDateChange: (value: DateFilter) => void
  /** Chỉ tab Của tôi có nhóm tình hình */
  group?: {
    value: 'all' | TGroup
    onChange: (value: 'all' | TGroup) => void
    options: GroupOption<TGroup>[]
  }
  hasFilter: boolean
  onReset: () => void
}

// Thanh tìm và lọc hàng chờ yêu cầu khảo sát, cùng bố cục với thanh lọc việc của kỹ thuật viên: ô tìm bề rộng cố định
// từ lg để cả cụm đứng sát nhau, bộ lọc đang áp dụng tô màu, "Xoá lọc" chỉ hiện khi có gì để xoá
export function SurveyRequestFilterBar<TGroup extends string>({
  search,
  onSearchChange,
  dateLabel,
  dateValue,
  onDateChange,
  group,
  hasFilter,
  onReset,
}: SurveyRequestFilterBarProps<TGroup>) {
  return (
    <div role="search" className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="min-w-0 flex-1 lg:w-80 lg:flex-none">
        <span className="sr-only">Tìm yêu cầu khảo sát</span>
        <SearchInput
          name="survey-request-search"
          placeholder="Tìm công trình, khách hàng hoặc phường, xã..."
          maxLength={100}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
        <label className="w-full sm:w-44">
          <span className="sr-only">{dateLabel}</span>
          <Select
            active={dateValue !== 'all'}
            value={dateValue}
            onChange={(e) => onDateChange(e.target.value as DateFilter)}
          >
            {DATE_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
        {group && (
          <label className="w-full sm:w-60">
            <span className="sr-only">Lọc theo tình hình</span>
            <Select
              active={group.value !== 'all'}
              value={group.value}
              onChange={(e) => group.onChange(e.target.value as 'all' | TGroup)}
            >
              <option value="all">Mọi tình hình</option>
              {group.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} ({o.count})
                </option>
              ))}
            </Select>
          </label>
        )}
        {hasFilter && (
          <Button variant="secondary" icon="filter_alt_off" onClick={onReset}>
            Xoá lọc
          </Button>
        )}
      </div>
    </div>
  )
}
