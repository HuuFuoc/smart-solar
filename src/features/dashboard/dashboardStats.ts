import type { MoneyBucket } from '@/types/res/paymentPlanRes'

// Phép tính thống kê của các trang Tổng quan: gom nhóm, chia theo tháng / ngày theo giờ Việt Nam, cộng tiền đúng định nghĩa của
// backend. Không bịa số: mọi hàm chỉ đếm / cộng trên dữ liệu được truyền vào. Chỉ import kiểu qua "@/" để chạy được bằng node --test

export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const dayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: VN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Ngày YYYY-MM-DD theo giờ Việt Nam của một thời điểm ISO; '' nếu không đọc được */
export function vnDayOf(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : dayKey.format(d)
}

/** Tháng YYYY-MM theo giờ Việt Nam */
export const vnMonthOf = (iso: string | null | undefined) => vnDayOf(iso).slice(0, 7)

const pad = (n: number) => String(n).padStart(2, '0')

/** Ngày cuối của tháng YYYY-MM */
export function lastDayOfMonth(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return `${month}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`
}

/** Cộng `n` ngày vào YYYY-MM-DD (tính ở 12:00 UTC nên không lệch ngày) */
export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Cộng `n` tháng vào YYYY-MM */
export function addMonths(month: string, n: number) {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

/** `count` tháng liền nhau kết thúc ở tháng `endMonth` (gồm cả tháng đó), cũ trước */
export function monthsEndingAt(endMonth: string, count: number) {
  return Array.from({ length: count }, (_, i) => addMonths(endMonth, i - count + 1))
}

/** "T11/26" cho trục; "Tháng 11/2026" cho tooltip */
export function monthAxisLabel(month: string) {
  const [y, m] = month.split('-')
  return `T${Number(m)}/${y!.slice(2)}`
}
export function monthTitle(month: string) {
  const [y, m] = month.split('-')
  return `Tháng ${Number(m)}/${y}`
}

export type PeriodSlice = { month: string; from: string; to: string; partial: boolean }

/**
 * Các kỳ tháng để vẽ xu hướng tiền đã thu: mỗi tháng là một lần gọi báo cáo với đúng khoảng ngày của tháng đó (cắt theo
 * from / to đã chọn), nên mỗi cột là tổng backend trả, không chia tổng của cả kỳ ra từng tháng.
 * Kỳ đã chọn ngắn hơn 2 tháng thì lấy `minMonths` tháng gần nhất tính tới tháng của `to`. Tối đa `maxMonths` tháng gần nhất.
 * `today`: tháng chưa hết thì kỳ dừng ở hôm nay và đánh dấu `partial`
 */
export function trendPeriods(from: string, to: string, today: string, { minMonths = 6, maxMonths = 12 } = {}) {
  const endMonth = to.slice(0, 7)
  const span = monthDiff(from.slice(0, 7), endMonth) + 1
  const extended = span < 2
  const count = extended ? minMonths : Math.min(span, maxMonths)
  const truncated = !extended && span > maxMonths
  const slices: PeriodSlice[] = monthsEndingAt(endMonth, count).map((month) => {
    const first = `${month}-01`
    const last = lastDayOfMonth(month)
    // Kỳ đã chọn bắt đầu giữa tháng thì cột đầu chỉ tính từ ngày đó; kỳ kết thúc giữa tháng thì cột cuối dừng ở ngày đó
    const sliceFrom = !extended && first < from ? from : first
    const sliceTo = last > to ? to : last
    return { month, from: sliceFrom, to: sliceTo, partial: sliceFrom !== first || sliceTo !== last || sliceTo >= today }
  })
  return { slices, extended, truncated }
}

export function monthDiff(a: string, b: string) {
  const [ya, ma] = a.split('-').map(Number) as [number, number]
  const [yb, mb] = b.split('-').map(Number) as [number, number]
  return (yb - ya) * 12 + (mb - ma)
}

/** Tiền đã thu trong kỳ của báo cáo tài chính: ba nhóm tách biệt của backend (khoản 30%, khoản 70%, hợp đồng cũ), không gồm
 * tiền chưa áp. Không cộng `installmentsCollectedByMethod` vì đó là cách chia lại của chính hai khoản 30% / 70% */
export function collectedInPeriod(v: {
  depositsCollected: MoneyBucket
  balancesCollected: MoneyBucket
  legacyContractPaymentsCollected: MoneyBucket
}) {
  return {
    amount: v.depositsCollected.amount + v.balancesCollected.amount + v.legacyContractPaymentsCollected.amount,
    count: v.depositsCollected.count + v.balancesCollected.count + v.legacyContractPaymentsCollected.count,
  }
}

/** Hợp đồng đang tính (bỏ bản đã thay bằng phụ lục và bản đã huỷ), như báo cáo tài chính của backend */
export const isLiveContract = (c: { status: string; stage?: string | null }) =>
  c.status !== 'SUPERSEDED' && c.status !== 'DISCARDED' && c.stage !== 'DISCARDED'

/** Đếm theo khoá; phần tử khoá rỗng bị bỏ */
export function countBy<T>(items: readonly T[], keyOf: (item: T) => string | null | undefined) {
  const map = new Map<string, number>()
  for (const item of items) {
    const key = keyOf(item)
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

/** Đếm và cộng tiền theo khoá */
export function bucketBy<T>(
  items: readonly T[],
  keyOf: (item: T) => string | null | undefined,
  amountOf: (item: T) => number,
) {
  const map = new Map<string, { count: number; amount: number }>()
  for (const item of items) {
    const key = keyOf(item)
    if (!key) continue
    const b = map.get(key) ?? { count: 0, amount: 0 }
    b.count += 1
    b.amount += amountOf(item)
    map.set(key, b)
  }
  return map
}

/** Đếm theo tháng (giờ Việt Nam) cho đúng danh sách tháng đưa vào; thời điểm ngoài các tháng đó không tính */
export function countByMonth<T>(
  items: readonly T[],
  dateOf: (item: T) => string | null | undefined,
  months: readonly string[],
) {
  const counts = new Map(months.map((m) => [m, 0]))
  for (const item of items) {
    const m = vnMonthOf(dateOf(item))
    if (counts.has(m)) counts.set(m, counts.get(m)! + 1)
  }
  return months.map((m) => ({ month: m, count: counts.get(m) ?? 0 }))
}

/** Gom các nhóm nhỏ thành "Khác" khi nhiều hơn `max` nhóm (giữ thứ tự gốc cho nhóm còn lại) */
export function foldTail<T extends { key: string; value: number }>(
  items: readonly T[],
  max: number,
  other: (value: number, folded: T[]) => T,
) {
  if (items.length <= max) return [...items]
  const ranked = [...items].sort((a, b) => b.value - a.value)
  const keep = new Set(ranked.slice(0, max - 1).map((i) => i.key))
  const folded = items.filter((i) => !keep.has(i.key))
  return [
    ...items.filter((i) => keep.has(i.key)),
    other(
      folded.reduce((s, i) => s + i.value, 0),
      folded,
    ),
  ]
}

/** Thứ Hai tới Chủ Nhật (YYYY-MM-DD) của tuần chứa `today` */
export function weekOf(today: string) {
  const d = new Date(`${today}T12:00:00Z`)
  const offset = (d.getUTCDay() + 6) % 7
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d)
    x.setUTCDate(d.getUTCDate() - offset + i)
    return x.toISOString().slice(0, 10)
  })
}

/** Các ngày (giờ Việt Nam) mà khoảng [startsAt, endsAt) chạm vào, chỉ trong `days` */
export function daysTouched(startsAt: string, endsAt: string | null | undefined, days: readonly string[]) {
  const start = vnDayOf(startsAt)
  const endIso = endsAt ? new Date(new Date(endsAt).getTime() - 1).toISOString() : startsAt
  const end = vnDayOf(endIso) || start
  return days.filter((d) => d >= start && d <= end)
}

/** Tổng tiền các khoản của gói 30/70 theo trạng thái thanh toán, cho khách xem: đã trả, phải trả ngay, chưa tới lúc trả.
 * Khoản đã huỷ không tính. Tiền đã trả lấy `paidAmount` nếu có (số backend đã xác minh), không thì số tiền của khoản */
export function installmentSplit(
  installments: readonly {
    kind: string
    amount: number
    status: string
    paidAmount: number | null
    overdue: boolean
  }[],
) {
  const out = { paid: 0, due: 0, overdue: 0, notYetDue: 0 }
  for (const i of installments) {
    if (i.status === 'PAID') out.paid += i.paidAmount ?? i.amount
    else if (i.status === 'DUE') {
      if (i.overdue) out.overdue += i.amount
      else out.due += i.amount
    } else if (i.status === 'PENDING') out.notYetDue += i.amount
  }
  return out
}

/** Hạn gần nhất còn mở (ISO) trong các thời điểm truyền vào; null nếu không có */
export function earliest(dates: readonly (string | null | undefined)[]) {
  const valid = dates.filter((d): d is string => Boolean(d) && !Number.isNaN(new Date(d!).getTime()))
  if (valid.length === 0) return null
  return valid.reduce((a, b) => (new Date(a).getTime() <= new Date(b).getTime() ? a : b))
}

export type PeriodPreset = 'month' | 'quarter' | 'half' | 'year' | 'custom'

/** Kỳ của các nút nhanh, theo ngày Việt Nam: tháng này, 3 / 6 tháng gần nhất (gồm tháng này), năm nay. Kết thúc ở cuối tháng này
 * như mặc định của backend, nên ngày tương lai trong tháng chỉ cộng 0 */
export function presetRange(preset: Exclude<PeriodPreset, 'custom'>, today: string) {
  const month = today.slice(0, 7)
  const to = lastDayOfMonth(month)
  if (preset === 'month') return { from: `${month}-01`, to }
  if (preset === 'quarter') return { from: `${addMonths(month, -2)}-01`, to }
  if (preset === 'half') return { from: `${addMonths(month, -5)}-01`, to }
  return { from: `${today.slice(0, 4)}-01-01`, to }
}

export function presetOf(from: string, to: string, today: string): PeriodPreset {
  for (const p of ['month', 'quarter', 'half', 'year'] as const) {
    const r = presetRange(p, today)
    if (r.from === from && r.to === to) return p
  }
  return 'custom'
}
