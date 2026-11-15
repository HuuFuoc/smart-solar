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

// Thanh tìm kiếm và lọc lịch theo ngày, giờ cho kỹ thuật viên. Một hàng: ô tìm giãn tới một bề rộng vừa đọc, ngày và
// giờ bề rộng cố định đứng sát bên; hẹp thì cụm ngày / giờ xuống hàng, điện thoại mỗi ô một hàng. Lọc ở máy nên không
// cần chờ ngừng gõ
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
    <div role="search" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="min-w-0 flex-1 sm:min-w-64 lg:max-w-md">
        <span className="sr-only">Tìm theo công trình, địa điểm, ngày, giờ</span>
        <SearchInput
          name="job-search"
          placeholder="Tìm theo công trình, địa điểm, ngày, giờ..."
          maxLength={100}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
          <DateField value={date} onChange={onDateChange} label="Lọc theo ngày" />
        </div>
        <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
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
          <Button variant="ghost" bleed={false} icon="filter_alt_off" onClick={onReset}>
            Xoá lọc
          </Button>
        )}
      </div>
    </div>
  )
}
