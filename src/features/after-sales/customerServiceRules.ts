import type {
  EntitlementView,
  ServiceRequestView,
  ServiceVisitView,
  SubscriptionView,
} from '@/types/res/customerAfterSalesRes'

// Luật sau bán phía khách, bám ServiceCustomerHandlers của backend `main` (7c79fa8): BookMaintenanceAsync,
// RescheduleMaintenanceAsync, BookingProblemAsync, RequestReconsiderationAsync, ReportFaultFromMaintenanceAsync. Chỉ để bật /
// tắt nút và báo trước khi gửi theo giờ máy; giờ máy có thể lệch nên backend vẫn kiểm lại và lỗi của backend luôn được hiện.
// Không import giá trị qua "@/" để chạy được bằng node --test

const TIME_ZONE = 'Asia/Ho_Chi_Minh'
const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

/** Mặc định của afterSales.maintenanceBookingLeadDays; quản trị đổi được nên backend vẫn kiểm */
export const BOOKING_LEAD_DAYS = 7
/** Mặc định của afterSales.appointmentChangeLeadHours */
export const CHANGE_LEAD_HOURS = 24
export const FAULT_DESCRIPTION_MIN = 5
export const FAULT_DESCRIPTION_MAX = 2000
export const RECONSIDERATION_NOTE_MAX = 1000
export const RECONSIDERATION_PHOTOS_MAX = 10

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const momentFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Ngày YYYY-MM-DD theo giờ Việt Nam của một thời điểm */
export const vnDay = (ms: number) => dayFormat.format(ms)
const vnMidnight = (day: string) => Date.parse(`${day}T00:00:00+07:00`)
/** Việt Nam không đổi giờ theo mùa nên cộng đúng 24 giờ mỗi ngày */
export const shiftDay = (day: string, days: number) => vnDay(vnMidnight(day) + days * DAY_MS)
const moment = (ms: number) => momentFormat.format(ms)

// ---------- Lượt bảo trì của gói ----------

export const BOOKABLE_STATUSES: readonly string[] = ['AVAILABLE', 'NOT_COMPLETED']

/** Lượt đặt lịch được: còn lượt (chưa đặt / lần trước chưa thực hiện) và gói đang hiệu lực */
export const isBookable = (e: Pick<EntitlementView, 'status'>, s: Pick<SubscriptionView, 'status' | 'projectId'>) =>
  BOOKABLE_STATUSES.includes(e.status) && s.status === 'ACTIVE' && s.projectId !== null

/** Hạn đặt của một lượt: tới khi gói hết hạn, hoặc tới hạn được kéo dài khi Smart Solar làm chậm */
export const entitlementDeadline = (e: Pick<EntitlementView, 'extendedUntil'>, s: Pick<SubscriptionView, 'endsAt'>) =>
  e.extendedUntil ?? s.endsAt

export type BookingLimits = {
  now: number
  leadDays: number
  /** Đầu kỳ của lượt; null khi không theo lượt của gói (bảo trì lẻ) */
  periodStartsAt: string | null
  /** Giờ hẹn phải trước mốc này; null khi không có hạn */
  latestAt: string | null
}

/**
 * Ngày chọn được trên lịch. Mở từ ngày thứ (lead + 1) để giờ nào trong ngày cũng đủ lead × 24 giờ như backend tính; không
 * trước ngày đầu kỳ (đầu kỳ không đúng 0 giờ thì từ ngày sau); tới ngày chứa thời điểm cuối cùng trước hạn.
 * `maxDay < minDay` là hết đường đặt
 */
export function bookingDays({ now, leadDays, periodStartsAt, latestAt }: BookingLimits) {
  let minDay = shiftDay(vnDay(now), leadDays + 1)
  if (periodStartsAt) {
    const start = Date.parse(periodStartsAt)
    let day = vnDay(start)
    if (start > vnMidnight(day)) day = shiftDay(day, 1)
    if (day > minDay) minDay = day
  }
  const maxDay = latestAt ? vnDay(Date.parse(latestAt) - 1) : null
  return { minDay, maxDay }
}

/** Lỗi của giờ muốn hẹn theo đúng các mốc backend kiểm (lead, đầu kỳ, hạn); null khi hợp lệ */
export function preferredStartProblem(startsAt: string, { now, leadDays, periodStartsAt, latestAt }: BookingLimits) {
  const start = Date.parse(startsAt)
  if (Number.isNaN(start)) return 'Chọn ngày và giờ muốn hẹn.'
  if (start < now + leadDays * DAY_MS) return `Chọn giờ cách bây giờ ít nhất ${leadDays} ngày.`
  if (periodStartsAt && start < Date.parse(periodStartsAt))
    return `Lượt bảo trì này đặt được từ ${moment(Date.parse(periodStartsAt))}.`
  if (latestAt && start >= Date.parse(latestAt))
    return `Chọn giờ trước ${moment(Date.parse(latestAt))}, hạn của lượt này.`
  return null
}

/** Lượt của gói gắn với một yêu cầu bảo trì, để đổi giờ theo đúng kỳ và hạn của lượt */
export function entitlementOf(
  r: Pick<ServiceRequestView, 'maintenanceEntitlementId'>,
  subscriptions: SubscriptionView[],
) {
  if (!r.maintenanceEntitlementId) return null
  for (const subscription of subscriptions) {
    const entitlement = subscription.entitlements.find((e) => e.entitlementId === r.maintenanceEntitlementId)
    if (entitlement) return { entitlement, subscription }
  }
  return null
}

// ---------- Đổi giờ ----------

export const isMaintenanceKind = (kind: string) => kind === 'MAINTENANCE' || kind === 'ONE_TIME_MAINTENANCE'

/** Trạng thái còn đổi giờ được trên mạng */
export const RESCHEDULABLE_STATUSES: readonly string[] = ['SUBMITTED', 'SCHEDULED', 'READY_FOR_WORK']

/** Yêu cầu bảo trì (của gói hoặc bảo trì lẻ) chưa bắt đầu làm và không có yêu cầu huỷ đang chờ */
export const canReschedule = (r: Pick<ServiceRequestView, 'kind' | 'status' | 'cancellationRequestedAt'>) =>
  isMaintenanceKind(r.kind) && RESCHEDULABLE_STATUSES.includes(r.status) && !r.cancellationRequestedAt

/** Buổi đã hẹn (chưa bắt đầu) của yêu cầu */
export const scheduledVisit = (r: Pick<ServiceRequestView, 'visits'>): ServiceVisitView | null =>
  r.visits.find((v) => v.status === 'SCHEDULED') ?? null

/** Hạn đổi giờ: trước giờ hẹn `leadHours`; null khi chưa có buổi hẹn (đổi lúc nào cũng được) */
export function rescheduleDeadline(r: Pick<ServiceRequestView, 'visits'>, leadHours = CHANGE_LEAD_HOURS) {
  const visit = scheduledVisit(r)
  return visit ? Date.parse(visit.startsAt) - leadHours * HOUR_MS : null
}

/** Đã quá hạn đổi giờ theo giờ máy (backend: StartsAt < now + lead) */
export function rescheduleTooLate(r: Pick<ServiceRequestView, 'visits'>, now: number, leadHours = CHANGE_LEAD_HOURS) {
  const deadline = rescheduleDeadline(r, leadHours)
  return deadline !== null && now > deadline
}

// ---------- Xin xét lại hỗ trợ thiên tai ----------

/** Backend tính sẵn: hỗ trợ bị từ chối và yêu cầu này chưa xin xét lại lần nào */
export const canRequestReconsideration = (r: Pick<ServiceRequestView, 'claim'>) =>
  r.claim?.canRequestReconsideration === true

export function reconsiderationNoteError(note: string) {
  if (!note.trim()) return 'Ghi điều ảnh hoặc thông tin bổ sung cho thấy.'
  if (note.trim().length > RECONSIDERATION_NOTE_MAX) return `Tối đa ${RECONSIDERATION_NOTE_MAX} ký tự.`
  return null
}

// ---------- Báo lỗi từ một lần bảo trì ----------

/** Ghi chú kỹ thuật viên phát hiện trong lần bảo trì gần nhất */
export function maintenanceFinding(r: Pick<ServiceRequestView, 'visits'>) {
  return [...r.visits].reverse().find((v) => v.findingNote)?.findingNote ?? null
}

/** Báo lỗi từ yêu cầu bảo trì khi kỹ thuật viên đã tới làm (đã báo cáo hoặc có ghi chú phát hiện) */
export const canReportFaultFromMaintenance = (r: Pick<ServiceRequestView, 'kind' | 'visits'>) =>
  isMaintenanceKind(r.kind) && r.visits.some((v) => v.reportedAt !== null || v.findingNote !== null)

/** Mô tả bỏ trống được khi kỹ thuật viên đã ghi điều phát hiện (backend lấy ghi chú đó làm mô tả) */
export function faultDescriptionError(text: string, finding: string | null) {
  const length = text.trim().length
  if (length === 0 && finding) return null
  if (length < FAULT_DESCRIPTION_MIN) return `Mô tả lỗi ít nhất ${FAULT_DESCRIPTION_MIN} ký tự.`
  if (length > FAULT_DESCRIPTION_MAX) return `Mô tả tối đa ${FAULT_DESCRIPTION_MAX} ký tự.`
  return null
}

// ---------- Báo lỗi do thiên tai (CreateFaultAsync) ----------

/**
 * Kỳ gói bảo vệ thiên tai đang hiệu lực của công trình, mỗi lúc chỉ có một. Không có kỳ này thì backend luôn ghi yêu cầu hỗ trợ
 * là NOT_ELIGIBLE (kỳ đã hết trước lúc gửi cũng vậy), nên form báo lỗi chỉ hỏi thiên tai khi có
 */
export const activeDisasterTerm = <T extends Pick<SubscriptionView, 'kind' | 'status'>>(subscriptions: T[]) =>
  subscriptions.find((s) => s.kind === 'DISASTER_PROTECTION' && s.status === 'ACTIVE')

/**
 * Lúc xảy ra sự cố: bắt buộc khi chọn thiên tai, không được sau lúc gửi. Trước mốc bảo vệ của kỳ đang hiệu lực thì backend vẫn
 * nhận nhưng chắc chắn ghi NOT_ELIGIBLE (thời gian chờ, hoặc kỳ trước đã hết lúc gửi) kèm lý do tiếng Anh, nên chặn ở đây
 */
export function incidentTimeError(at: string, coverageStartsAt: string | null, now = Date.now()) {
  const ms = at ? Date.parse(at) : Number.NaN
  if (Number.isNaN(ms)) return 'Chọn ngày và giờ xảy ra sự cố.'
  if (ms > now) return 'Lúc này chưa tới; chọn lúc sự cố đã xảy ra.'
  if (coverageStartsAt && ms < Date.parse(coverageStartsAt))
    return 'Gói chưa bảo vệ vào lúc này. Chọn "Không" ở ô thiên tai để báo lỗi thường.'
  return null
}
