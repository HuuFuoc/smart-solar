import { Button } from '@/components/common/ui/button'
import { DateField, SearchInput, TimeSelect } from '@/components/common/ui/field'

type TechJobFilterBarProps = {
  search: string
  onSearchChange: (value: string) => void
  date: string
  onDateChange: (value: string) => void
  time: string
  onTimeChange: (value: string) => void
  hasFilter: boolean
  onReset: () => void
}

// Thanh tìm kiếm và lọc lịch theo ngày, giờ cho kỹ thuật viên
export function TechJobFilterBar({
  search,
  onSearchChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  hasFilter,
  onReset,
}: TechJobFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Tìm kiếm công trình, ngày, giờ</span>
        <SearchInput
          name="job-search"
          placeholder="Tìm theo công trình, ngày, giờ..."
          maxLength={100}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
        <div className="w-full sm:w-40">
          <span className="sr-only">Lọc theo ngày</span>
          <DateField value={date} onChange={onDateChange} label="Lọc theo ngày" />
        </div>
        <div className="w-full sm:w-36">
          <span className="sr-only">Lọc theo giờ</span>
          <TimeSelect
            value={time}
            onChange={onTimeChange}
            from="07:00"
            to="18:00"
            step={30}
            emptyLabel="Tất cả giờ"
            aria-label="Lọc theo giờ"
            active={time !== ''}
          />
        </div>
        {hasFilter && (
          <Button variant="secondary" icon="close" onClick={onReset}>
            Xoá lọc
          </Button>
        )}
      </div>
    </div>
  )
}
