import type { Tone } from '@/components/common/ui/badge'
import { addDays, vnDate, weekdayOf } from './schedulingDisplay.ts'

// Phép tính ngày của lịch làm việc (tháng / tuần). Mọi ngày là chuỗi YYYY-MM-DD theo giờ Việt Nam, tuần bắt đầu từ Thứ Hai

export type WorkKind = 'survey' | 'installation' | 'service'

export type WorkItem = {
  id: string
  kind: WorkKind
  title: string
  startsAt: string
  endsAt: string
  /** Đường dẫn trang chi tiết */
  to: string
  /** Đã xong: vẽ nhạt */
  done: boolean
  /** Mã hiển thị của việc, null khi không có */
  code: string | null
  address: string | null
  note: string | null
  /** Số điện thoại khách, chỉ có ở công trình lắp đặt */
  phone: string | null
  statusLabel: string
  statusTone: Tone
  /** Chữ của nút mở trang chi tiết */
  actionLabel: string
}

export type DayEntry = {
  item: WorkItem
  /** Việc kéo dài nhiều ngày, đây là ngày sau ngày bắt đầu */ continued: boolean
}

/** Việc nhiều ngày chỉ được rải tối đa chừng này ngày để dữ liệu lạ không làm treo trang */
const MAX_SPAN_DAYS = 62

/** Ngày đầu tháng của ngày đã cho */
export const monthStart = (date: string) => `${date.slice(0, 7)}-01`

/** Ngày cuối tháng của ngày đã cho */
export function monthEnd(date: string) {
  const first = monthStart(date)
  const [y, m] = first.split('-').map(Number) as [number, number]
  return addDays(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`, -1)
}

/** Ngày đầu của tháng cách `months` tháng */
export function addMonths(date: string, months: number) {
  const [y, m] = monthStart(date).split('-').map(Number) as [number, number]
  const index = y * 12 + (m - 1) + months
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-01`
}

/** Thứ Hai của tuần chứa ngày này */
export function weekStart(date: string) {
  const w = weekdayOf(date)
  return addDays(date, -(w === 0 ? 6 : w - 1))
}

/** Bảy ngày của tuần chứa ngày này, từ Thứ Hai */
export const weekDays = (date: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(date), i))

/** Lưới của tháng: các tuần đủ bảy ngày, gồm cả ngày của tháng trước / sau để lấp đầy hàng */
export function monthGrid(date: string) {
  const first = weekStart(monthStart(date))
  const last = addDays(weekStart(monthEnd(date)), 6)
  const days: string[] = []
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d)
  return days
}

/** Chia việc theo ngày; việc kéo dài sang ngày khác hiện ở mọi ngày nó chạm tới. Trong ngày, giờ bắt đầu sớm trước */
export function entriesByDay(items: readonly WorkItem[]) {
  const map = new Map<string, DayEntry[]>()
  const sorted = [...items].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  for (const item of sorted) {
    const first = vnDate(item.startsAt)
    if (!first) continue
    const last = vnDate(item.endsAt) || first
    let day = first
    for (let i = 0; i <= MAX_SPAN_DAYS && day <= (last < first ? first : last); i++) {
      const list = map.get(day)
      const entry = { item, continued: day !== first }
      if (list) list.push(entry)
      else map.set(day, [entry])
      day = addDays(day, 1)
    }
  }
  return map
}

/** Việc bắt đầu trong khoảng ngày [from, to] */
export const startingBetween = (items: readonly WorkItem[], from: string, to: string) =>
  items.filter((item) => {
    const day = vnDate(item.startsAt)
    return day >= from && day <= to
  })

/** Số phút làm việc trong một ngày: phần của mỗi việc nằm trong ngày đó (giờ Việt Nam), việc chồng giờ không bị tính hai lần */
export function dayMinutes(items: readonly Pick<WorkItem, 'startsAt' | 'endsAt'>[], day: string) {
  const dayStart = Date.parse(`${day}T00:00:00+07:00`)
  const dayEnd = Date.parse(`${addDays(day, 1)}T00:00:00+07:00`)
  const spans = items
    .map((i) => [Math.max(Date.parse(i.startsAt), dayStart), Math.min(Date.parse(i.endsAt), dayEnd)] as const)
    .filter(([from, to]) => Number.isFinite(from) && Number.isFinite(to) && to > from)
    .sort((a, b) => a[0] - b[0])
  let total = 0
  let reach = -Infinity
  for (const [from, to] of spans) {
    total += Math.max(0, to - Math.max(from, reach))
    reach = Math.max(reach, to)
  }
  return Math.round(total / 60000)
}
