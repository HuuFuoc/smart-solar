import { WEEK_DAYS } from '@/common/scheduling'
import type { WorkingPeriodView } from '@/types/res/adminTechniciansRes'

export type Day = (typeof WEEK_DAYS)[number]['value']
export type Period = { start: string; end: string }
export type Week = Record<Day, Period[]>

export const MAX_PERIODS = 42

export const STANDARD_DAY_PERIODS: Period[] = [
  { start: '08:00', end: '12:00' },
  { start: '13:00', end: '17:00' },
]

export function toWeek(periods: WorkingPeriodView[]): Week {
  const week = Object.fromEntries(WEEK_DAYS.map((d) => [d.value, [] as Period[]])) as Week
  for (const p of periods) {
    if (p.day in week) week[p.day as Day].push({ start: p.start, end: p.end })
  }
  return week
}

export function calculatePeriodHours(start: string, end: string): string {
  if (!start || !end) return ''
  const [h1 = 0, m1 = 0] = start.split(':').map(Number)
  const [h2 = 0, m2 = 0] = end.split(':').map(Number)
  const minutes = h2 * 60 + m2 - (h1 * 60 + m1)
  if (minutes <= 0) return ''
  const hours = Math.round((minutes / 60) * 10) / 10
  return `${hours} giờ`
}

export function calculateDayHours(periods: Period[]): number {
  let totalMinutes = 0
  for (const p of periods) {
    if (!p.start || !p.end) continue
    const parts1 = p.start.split(':').map(Number)
    const parts2 = p.end.split(':').map(Number)
    const h1 = parts1[0] ?? 0
    const m1 = parts1[1] ?? 0
    const h2 = parts2[0] ?? 0
    const m2 = parts2[1] ?? 0
    if (h2 * 60 + m2 > h1 * 60 + m1) {
      totalMinutes += h2 * 60 + m2 - (h1 * 60 + m1)
    }
  }
  return Math.round((totalMinutes / 60) * 10) / 10
}

export function weekIssue(week: Week): string | null {
  const all = Object.values(week).flat()
  if (all.length === 0) return 'Cần ít nhất một khoảng làm việc trong tuần, hoặc chọn giờ chung của hệ thống.'
  if (all.length > MAX_PERIODS) return `Tối đa ${MAX_PERIODS} khoảng mỗi tuần.`
  for (const d of WEEK_DAYS) {
    const sorted = [...week[d.value]].sort((a, b) => a.start.localeCompare(b.start))
    for (const [i, p] of sorted.entries()) {
      if (!p.start || !p.end) return `${d.label}: nhập đủ giờ bắt đầu và kết thúc.`
      if (p.end <= p.start) return `${d.label}: giờ kết thúc phải sau giờ bắt đầu (${p.start}-${p.end}).`
      const prev = sorted[i - 1]
      if (prev && p.start < prev.end)
        return `${d.label}: hai khoảng ${prev.start}-${prev.end} và ${p.start}-${p.end} chồng nhau.`
    }
  }
  return null
}
