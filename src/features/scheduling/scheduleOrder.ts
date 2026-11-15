import { vnDate } from './schedulingDisplay.ts'

// Thứ tự chung của danh sách lịch hẹn / việc: ngày mới nhất lên đầu, trong một ngày giờ bắt đầu sớm trước như ca làm.
// So thời điểm thật chứ không so chuỗi vì backend có thể trả "Z" hoặc "+07:00"

const instant = (iso: string) => {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : t
}

/** So hai giờ bắt đầu theo thứ tự chung; thiếu giờ thì xuống cuối */
export function compareSchedule(a: string | null | undefined, b: string | null | undefined): number {
  const ta = a ? instant(a) : null
  const tb = b ? instant(b) : null
  if (ta === null || tb === null) return ta === tb ? 0 : ta === null ? 1 : -1
  const da = vnDate(a!)
  const db = vnDate(b!)
  if (da !== db) return da < db ? 1 : -1
  return ta - tb
}

export const byStartsAt = (a: { startsAt: string }, b: { startsAt: string }) => compareSchedule(a.startsAt, b.startsAt)

/** Nhóm theo ngày (giờ Việt Nam) theo thứ tự chung, không phụ thuộc thứ tự đầu vào */
export function groupByDay<T extends { startsAt: string }>(rows: readonly T[]): [day: string, items: T[]][] {
  const groups = new Map<string, T[]>()
  for (const row of [...rows].sort(byStartsAt)) {
    const day = vnDate(row.startsAt)
    const items = groups.get(day)
    if (items) items.push(row)
    else groups.set(day, [row])
  }
  return [...groups]
}
