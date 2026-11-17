import { DayName } from '@/features/scheduling/DayGroupedTable'

// Tiêu đề một ngày của danh sách thẻ việc (Khảo sát, Lắp đặt, Bảo hành của kỹ thuật viên): tên ngày và số việc
export function DayGroupHeading({
  day,
  today,
  count,
  unit,
}: {
  day: string
  today: string
  count: number
  unit: string
}) {
  return (
    <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <DayName day={day} today={today} />
      <span className="tnum text-meta font-normal text-fg-2">
        {count} {unit}
      </span>
    </h2>
  )
}
