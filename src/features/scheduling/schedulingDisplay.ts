import { SURFACE_NAMES } from '@/common/preSurvey'
import {
  ACCEPTANCE_STATUSES,
  APPOINTMENT_LABELS,
  APPOINTMENT_TONES,
  ASSIGNMENT_SOURCES,
  COVERAGE_STATUSES,
  INELIGIBLE_REASONS,
  TECHNICIAN_APPOINTMENT_LABELS,
  WEEK_DAYS,
  type AppointmentViewer,
} from '@/common/scheduling'
import type { Tone } from '@/components/common/ui/badge'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { ConflictingAppointmentView } from '@/types/res/adminTechniciansRes'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'

// Nhãn và định dạng của lịch khảo sát, dùng chung cho mọi vai trò
// Luôn dùng giờ Việt Nam: ngày gửi API là "YYYY-MM-DD", giờ hẹn kèm "+07:00"
// Không dùng `new Date('2026-10-20')` vì nó hiểu là nửa đêm UTC

export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh'
const VN_OFFSET = '+07:00'

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: VN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: VN_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const WEEKDAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function toDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? null : date
}

/** Ngày (YYYY-MM-DD) theo giờ Việt Nam của một thời điểm. */
export function vnDate(value: string | Date) {
  const date = toDate(value)
  return date ? dayKeyFormat.format(date) : ''
}

export function todayVn(now: Date = new Date()) {
  return dayKeyFormat.format(now)
}

/** Cộng ngày trên chuỗi ngày; tính ở 12:00 UTC nên không lệch ngày vì múi giờ. */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function parts(date: string) {
  const d = new Date(`${date}T12:00:00Z`)
  return { weekday: d.getUTCDay(), day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "Thứ Ba, 20/10" (kèm năm khi `year`). */
export function formatDay(date: string, { year = false }: { year?: boolean } = {}) {
  if (!date) return '—'
  const p = parts(date)
  return `${WEEKDAYS[p.weekday]}, ${pad(p.day)}/${pad(p.month)}${year ? `/${p.year}` : ''}`
}

/** Ô ngày của bộ chọn: "T3" và "20/10". */
export function dayChip(date: string) {
  const p = parts(date)
  return { weekday: WEEKDAYS_SHORT[p.weekday]!, date: `${pad(p.day)}/${pad(p.month)}`, isSunday: p.weekday === 0 }
}

/** "Hôm nay", "Ngày mai", hoặc "Thứ Ba, 20/10". */
export function relativeDay(date: string, today = todayVn()) {
  if (date === today) return 'Hôm nay'
  if (date === addDays(today, 1)) return 'Ngày mai'
  return formatDay(date)
}

/** "08:00" theo giờ Việt Nam. */
export function formatTime(iso: string | null | undefined) {
  const date = iso ? toDate(iso) : null
  return date ? timeFormat.format(date) : '—'
}

/** "08:00-09:30" */
export function formatTimeRange(startIso: string, endIso: string) {
  return `${formatTime(startIso)}–${formatTime(endIso)}`
}

/** "Thứ Ba, 20/10/2026, 08:00-09:30" */
export function formatAppointment(startIso: string, endIso: string) {
  return `${formatDay(vnDate(startIso), { year: true })}, ${formatTimeRange(startIso, endIso)}`
}

/** "20/10/2026 08:00" theo giờ Việt Nam. */
export function formatMoment(iso: string | null | undefined) {
  const date = iso ? toDate(iso) : null
  if (!date) return '—'
  const p = parts(vnDate(date))
  return `${pad(p.day)}/${pad(p.month)}/${p.year} ${timeFormat.format(date)}`
}

/** Giờ hẹn gửi API: "2026-10-20T08:00:00+07:00". */
export function vnTimestamp(date: string, time: string) {
  return `${date}T${time}:00${VN_OFFSET}`
}

/** Giới hạn đặt trước của backend: 30 ngày kể cả hôm nay */
export const BOOKING_HORIZON_DAYS = 30

/** Ngày mở sẵn: hôm nay, nhưng qua 15:30 thì mở ngày mai vì hôm nay gần như hết giờ trống */
export function initialBookingDate(now: Date = new Date()) {
  const today = todayVn(now)
  return timeFormat.format(now) >= '15:30' ? addDays(today, 1) : today
}

export function appointmentStatusMeta(
  status: string | null | undefined,
  viewer: AppointmentViewer,
): { label: string; tone: Tone } {
  if (!status) return { label: '—', tone: 'neutral' }
  return {
    label:
      (viewer === 'technician' ? TECHNICIAN_APPOINTMENT_LABELS[status] : undefined) ??
      APPOINTMENT_LABELS[status] ??
      status,
    tone: APPOINTMENT_TONES[viewer][status] ?? 'neutral',
  }
}

export function assignmentSourceLabel(source: string | null | undefined, viewer: AppointmentViewer) {
  if (!source) return '—'
  if (viewer === 'technician' && source === 'SELF_ACCEPTED') return 'Bạn tự nhận'
  return ASSIGNMENT_SOURCES[source] ?? source
}

/** Kỹ thuật viên đã xác nhận lịch (tự nhận hoặc được phân công) */
export function isConfirmed(status: string | null | undefined) {
  return status === 'ACCEPTED' || status === 'ASSIGNED' || status === 'COMPLETED'
}

/** Trạng thái của một lần đặt trong lịch sử (khách hàng) */
export function historyStatusLabel(status: string) {
  return status === 'CANCELLED' ? 'Đã huỷ hoặc đổi giờ' : (APPOINTMENT_LABELS[status] ?? status)
}

export function acceptanceStatusMeta(status: string): { label: string; tone: Tone } {
  return ACCEPTANCE_STATUSES[status] ?? { label: status, tone: 'neutral' }
}

// Gộp trạng thái yêu cầu + lịch hẹn thành một nhãn. Chưa đặt giờ là việc của khách nên tô đỏ
export function customerProgress(r: Pick<CustomerSurveyRequestView, 'status' | 'appointment'>): {
  label: string
  tone: Tone
} {
  if (r.status === 'COMPLETED') return { label: 'Đã khảo sát xong', tone: 'neutral' }
  if (r.status === 'CANCELLED') return { label: 'Đã huỷ', tone: 'neutral' }
  const a = r.appointment
  if (!a)
    return canBook(r)
      ? { label: 'Chưa đặt giờ khảo sát', tone: 'danger' }
      : { label: 'Chưa có lịch hẹn', tone: 'neutral' }
  return acceptanceStatusMeta(a.acceptanceStatus)
}

/** Khách đặt giờ được khi yêu cầu chưa có lịch hiệu lực */
export function canBook(r: Pick<CustomerSurveyRequestView, 'status' | 'appointment'>) {
  return !r.appointment && r.status === 'PENDING'
}

export function coverageText(status: string) {
  return COVERAGE_STATUSES[status] ?? null
}

export function ineligibleLabel(code: string | null | undefined) {
  if (!code) return null
  return INELIGIBLE_REASONS[code] ?? code
}

/** Danh sách lịch bị ảnh hưởng trong lỗi 409 TECHNICIAN_HAS_CONFLICTING_APPOINTMENTS */
export function conflictsOf(error: unknown): ConflictingAppointmentView[] {
  if (!isApiError(error) || error.code !== 'TECHNICIAN_HAS_CONFLICTING_APPOINTMENTS') return []
  const details = error.details as { conflictingAppointments?: unknown } | null
  return Array.isArray(details?.conflictingAppointments)
    ? (details.conflictingAppointments as ConflictingAppointmentView[])
    : []
}

/** Câu lỗi khi xếp lịch, 429 thì kèm số giây phải chờ */
export function schedulingErrorMessage(error: unknown) {
  if (isApiError(error) && error.status === 429 && error.retryAfter) {
    return `Bạn thao tác quá nhanh. Thử lại sau ${error.retryAfter} giây.`
  }
  return errorMessage(error)
}

export function weekDayLabel(day: string) {
  return WEEK_DAYS.find((d) => d.value === day)?.label ?? day
}

// Kỹ thuật viên nhận được lịch không. Chưa thuộc khu vực nào thì tô đỏ, tắt nhận lịch / bị khoá thì xám
export function technicianReadiness(t: {
  readyForScheduling: boolean
  isActiveUser: boolean
  isSchedulingActive: boolean
  zones: unknown[]
}): { label: string; tone: Tone } {
  if (t.readyForScheduling) return { label: 'Sẵn sàng nhận lịch', tone: 'ok' }
  if (!t.isActiveUser) return { label: 'Tài khoản không hoạt động', tone: 'neutral' }
  if (t.zones.length === 0) return { label: 'Chưa thuộc khu vực nào', tone: 'danger' }
  return { label: 'Đang tắt nhận lịch', tone: 'neutral' }
}

export function surfaceNameLabel(value: string | null | undefined) {
  return value ? (SURFACE_NAMES[value] ?? value) : '—'
}
