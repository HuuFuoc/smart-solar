import type { WarrantyOptionView } from '@/types/res/adminAfterSalesRes'

// Luật phía quản trị sau bán: thời hạn bảo hành, ghi nhận hoàn tiền, bộ lọc báo cáo. Bám handler của backend
// (ServicePackageHandlers.SaveWarrantyOptionAsync, RefundHandlers.RecordAsync, AfterSalesDashboard.GetAsync); backend vẫn kiểm lại
// Không import giá trị qua "@/" để chạy được bằng node --test

export const WARRANTY_MONTHS = { min: 1, max: 240 } as const
/** Mỗi khoảng ngày của báo cáo dài tối đa 367 ngày, tính cả hai đầu */
export const DASHBOARD_MAX_RANGE_DAYS = 367
export const REFUND_REFERENCE_MAX = 100

/** Số tháng bảo hành vừa gõ, null khi không hợp lệ */
export function parseWarrantyMonths(text: string): number | null {
  const value = Number(text.trim())
  return Number.isInteger(value) && value >= WARRANTY_MONTHS.min && value <= WARRANTY_MONTHS.max ? value : null
}

export function warrantyMonthsError(text: string) {
  if (!text.trim()) return 'Nhập số tháng.'
  return parseWarrantyMonths(text) === null
    ? `Số tháng nguyên từ ${WARRANTY_MONTHS.min} đến ${WARRANTY_MONTHS.max}.`
    : undefined
}

/** Tuỳ chọn mặc định đang bật của một loại; kinh doanh lập hợp đồng không chọn thời hạn thì dùng tuỳ chọn này */
export function activeDefault(options: WarrantyOptionView[], kind: string) {
  return options.find((o) => o.kind === kind && o.isActive && o.isDefault) ?? null
}

/** Backend phát hành hợp đồng chỉ khi chọn được một thời hạn lắp đặt: cần ít nhất một tuỳ chọn đang bật */
export function installationWarrantyGap(options: WarrantyOptionView[]) {
  const active = options.filter((o) => o.kind === 'INSTALLATION' && o.isActive)
  if (active.length === 0) return 'none' as const
  if (!active.some((o) => o.isDefault)) return 'no-default' as const
  return null
}

/** Sắp theo số tháng như backend, tuỳ chọn đang bật lên trước */
export function sortWarrantyOptions(options: WarrantyOptionView[]) {
  return [...options].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.months - b.months)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Ngày cuối của tháng chứa `date` (YYYY-MM-DD) */
function monthEnd(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Tháng chứa `today` và tháng trước đó, như mặc định của backend khi không gửi khoảng ngày */
export function defaultDashboardRanges(today: string) {
  const [year, month] = today.split('-').map(Number) as [number, number]
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(monthEnd(year, month))}`,
    compareFrom: `${prevYear}-${pad(prevMonth)}-01`,
    compareTo: `${prevYear}-${pad(prevMonth)}-${pad(monthEnd(prevYear, prevMonth))}`,
  }
}

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000

/** Lỗi của một khoảng ngày, undefined khi hợp lệ */
export function rangeError(from: string, to: string) {
  if (!from || !to) return 'Chọn đủ ngày bắt đầu và ngày kết thúc.'
  if (to < from) return 'Ngày kết thúc phải từ ngày bắt đầu trở đi.'
  if (dayNumber(to) - dayNumber(from) + 1 > DASHBOARD_MAX_RANGE_DAYS)
    return `Mỗi khoảng dài tối đa ${DASHBOARD_MAX_RANGE_DAYS} ngày.`
  return undefined
}

export type DashboardFilter = {
  from: string
  to: string
  compareFrom: string
  compareTo: string
  zoneId: string
  serviceType: string
  status: string
}

/** Query của GET .../dashboard và .../dashboard/export, tên tham số đúng như swagger; bỏ ô trống */
export function dashboardParams(f: DashboardFilter) {
  const params: Record<string, string> = {
    From: f.from,
    To: f.to,
    CompareFrom: f.compareFrom,
    CompareTo: f.compareTo,
    ZoneId: f.zoneId,
    ServiceType: f.serviceType,
    Status: f.status,
  }
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))
}

/** Tên tệp CSV theo hai khoảng đang xem */
export function dashboardCsvName(f: Pick<DashboardFilter, 'from' | 'to' | 'compareFrom' | 'compareTo'>) {
  return `bao-cao-sau-ban_${f.from}_${f.to}_so-voi_${f.compareFrom}_${f.compareTo}.csv`
}

/** Thời điểm đã trả tiền, gửi kèm múi giờ Việt Nam: "2026-11-03T09:30:00+07:00" */
export function refundedAtValue(date: string, time: string) {
  return `${date}T${time}:00+07:00`
}

/** Backend không nhận ngày hoàn ở tương lai */
export function refundedAtError(date: string, time: string, now: Date = new Date()) {
  if (!date || !time) return 'Chọn ngày và giờ đã chuyển tiền.'
  const at = Date.parse(refundedAtValue(date, time))
  if (Number.isNaN(at)) return 'Ngày giờ chưa hợp lệ.'
  if (at > now.getTime()) return 'Ngày giờ đã chuyển tiền không được ở tương lai.'
  return undefined
}
