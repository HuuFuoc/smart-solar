import { vnDayOf } from '@/features/dashboard/dashboardStats'
import { formatTime, formatTimeRange } from '@/features/scheduling/schedulingDisplay'

/** "08:00–17:00" trong một ngày; "08:00 18/11 – 17:00 20/11" khi việc kéo nhiều ngày */
export function whenText(startsAt: string, endsAt: string) {
  const a = vnDayOf(startsAt)
  const b = vnDayOf(new Date(new Date(endsAt).getTime() - 1).toISOString())
  if (!a || a === b) return formatTimeRange(startsAt, endsAt)
  const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
  return `${formatTime(startsAt)} ${dm(a)} – ${formatTime(endsAt)} ${dm(b)}`
}
