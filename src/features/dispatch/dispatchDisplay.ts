import {
  DISPATCH_EVENTS,
  DISPATCH_REASONS,
  DISPATCH_RESOLUTIONS,
  DISPATCH_SESSIONS,
  DISPATCH_STATUSES,
  PROPOSAL_STATUSES,
  type DispatchSession,
} from '@/common/dispatch'
import type { Tone } from '@/components/common/ui/badge'
import {
  BOOKING_HORIZON_DAYS,
  addDays,
  canBook,
  customerProgress,
  formatDay,
  formatTimeRange,
  todayVn,
  vnDate,
  vnTimestamp,
} from '@/features/scheduling/schedulingDisplay'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { CustomerDispatchView, DispatchStatus, PreferredWindowView } from '@/types/res/dispatchRes'

// Nhãn và quy tắc của điều phối kỹ thuật viên, dùng chung cho khách và nhân viên

/** Còn đang xử lý: chờ nhân viên hoặc chờ khách trả lời đề xuất */
export function isActiveDispatch(status: DispatchStatus | null | undefined) {
  return status === 'OPEN' || status === 'PROPOSAL_PENDING'
}

export function dispatchStatusMeta(status: string): { label: string; tone: Tone } {
  return DISPATCH_STATUSES[status] ?? { label: status, tone: 'neutral' }
}

/** Khách thấy: đang chờ Smart Solar là việc của người khác (xanh), có đề xuất là việc của khách (đỏ) */
export function customerDispatchMeta(d: Pick<CustomerDispatchView, 'status'>): { label: string; tone: Tone } {
  if (d.status === 'OPEN') return { label: 'Đang xếp kỹ thuật viên', tone: 'info' }
  if (d.status === 'PROPOSAL_PENDING') return { label: 'Chờ bạn xác nhận giờ', tone: 'danger' }
  return dispatchStatusMeta(d.status)
}

type RequestState = Pick<CustomerSurveyRequestView, 'status' | 'appointment'>

/** Nhãn yêu cầu khảo sát của khách, tính cả khi đang nhờ Smart Solar xếp kỹ thuật viên */
export function customerRequestProgress(r: RequestState, d: CustomerDispatchView | null | undefined) {
  return canBook(r) && d && isActiveDispatch(d.status) ? customerDispatchMeta(d) : customerProgress(r)
}

/** Việc của khách: đặt giờ (chưa nhờ xếp kỹ thuật viên) hoặc trả lời giờ Smart Solar đề xuất */
export function customerRequestTodo(r: RequestState, d: CustomerDispatchView | null | undefined) {
  if (!canBook(r)) return false
  return d?.status === 'PROPOSAL_PENDING' || !isActiveDispatch(d?.status)
}

export function dispatchReasonLabel(reason: string) {
  return DISPATCH_REASONS[reason] ?? reason
}

export function proposalStatusMeta(status: string): { label: string; tone: Tone } {
  return PROPOSAL_STATUSES[status] ?? { label: status, tone: 'neutral' }
}

export function dispatchResolutionLabel(resolution: string | null | undefined) {
  if (!resolution) return null
  return DISPATCH_RESOLUTIONS[resolution] ?? resolution
}

export function dispatchEventLabel(type: string) {
  return DISPATCH_EVENTS[type] ?? type
}

/** "Thứ Ba, 03/11, 08:00–12:00" */
export function formatWindow(w: PreferredWindowView) {
  return `${formatDay(vnDate(w.startsAt))}, ${formatTimeRange(w.startsAt, w.endsAt)}`
}

/** Khung giờ khách xin đã tới giờ bắt đầu: backend không nhận lịch cho giờ đã qua */
export function windowPassed(w: PreferredWindowView, now: number) {
  return new Date(w.startsAt).getTime() <= now
}

/** Một dòng khung giờ trên form của khách */
export type WindowDraft = { key: number; date: string; session: DispatchSession }

/** Khung giờ gửi API, giờ Việt Nam kèm "+07:00" */
export function toPreferredWindow(w: Pick<WindowDraft, 'date' | 'session'>): PreferredWindowView {
  const session = DISPATCH_SESSIONS.find((s) => s.value === w.session) ?? DISPATCH_SESSIONS[0]
  return { startsAt: vnTimestamp(w.date, session.from), endsAt: vnTimestamp(w.date, session.to) }
}

/** Lỗi của từng dòng: trùng nhau hoặc đã qua giờ bắt đầu */
export function windowProblems(windows: WindowDraft[], now = Date.now()) {
  const seen = new Set<string>()
  const lastDay = addDays(todayVn(new Date(now)), BOOKING_HORIZON_DAYS - 1)
  return windows.map((w) => {
    const id = `${w.date}|${w.session}`
    const duplicate = seen.has(id)
    seen.add(id)
    if (duplicate) return 'Khung giờ này đã chọn ở trên.'
    if (new Date(toPreferredWindow(w).startsAt).getTime() <= now)
      return 'Khung giờ này đã bắt đầu, chọn buổi hoặc ngày sau.'
    if (w.date > lastDay) return `Chỉ chọn được trong ${BOOKING_HORIZON_DAYS} ngày tới.`
    return null
  })
}
