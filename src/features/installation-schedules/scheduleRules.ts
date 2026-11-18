import type { InstallationScheduleRequest } from '@/types/req/technicianInstallationSchedulesReq'
import type { InstallationScheduleView } from '@/types/res/installationSchedulesRes'

// Luật lịch thi công đã thống nhất với khách, bám InstallationScheduleHandlers + InstallationSchedulePlanner của backend
// (ProposeAsync, CancelAsync, RequestChangeAsync, ValidateIntervalAsync). Chỉ để bật / tắt nút và báo lỗi trước khi gửi;
// backend vẫn kiểm lại giờ làm, lịch nghỉ, khu vực, việc khác. Không import giá trị qua "@/" để chạy được bằng node --test

/** Ghi chú, lý do: backend cắt ở 500 ký tự */
export const SCHEDULE_NOTE_MAX = 500

type Schedule = Pick<InstallationScheduleView, 'status'>

/** Lịch đang hiệu lực (mỗi hợp đồng nhiều nhất một): dự kiến, đã xác nhận, phải hẹn lại */
export const isLiveSchedule = (s: Schedule) =>
  s.status === 'PLANNED' || s.status === 'CONFIRMED' || s.status === 'RESCHEDULE_REQUIRED'

/** Lịch đang hiệu lực trong lịch sử của một hợp đồng (backend trả mới nhất trước) */
export const liveSchedule = <T extends Schedule>(history: T[]): T | null => history.find(isLiveSchedule) ?? null

/** Hẹn ngày được khi hợp đồng đã ký hoặc đã thanh toán */
export const canPlanForContract = (contractStatus: string) => contractStatus === 'SIGNED' || contractStatus === 'PAID'

/** Dự án thi công đã bắt đầu / đã huỷ thì không đổi lịch ở đây (INSTALLATION_SCHEDULE_INSTALLATION_STARTED) */
const STARTED_PROJECT = ['IN_PROGRESS', 'REWORK_REQUIRED', 'PENDING_CUSTOMER_ACCEPTANCE', 'COMPLETED', 'CANCELLED']
export const projectLocksSchedule = (projectStatus: string | null | undefined) =>
  projectStatus != null && STARTED_PROJECT.includes(projectStatus)

/** Huỷ ở đây chỉ lịch dự kiến hoặc phải hẹn lại; lịch đã xác nhận là phân công của dự án thi công, quản lý xử lý trên dự án */
export const canCancelSchedule = (s: Schedule) => s.status === 'PLANNED' || s.status === 'RESCHEDULE_REQUIRED'

/** Khách xin đổi ngày: lịch đang hiệu lực và dự án chưa bắt đầu thi công */
export const canRequestChange = (s: Pick<InstallationScheduleView, 'status' | 'projectStatus'>) =>
  isLiveSchedule(s) && !projectLocksSchedule(s.projectStatus)

/** Quản lý thử xác nhận lại: lịch dự kiến của hợp đồng đã thanh toán (backend tự thử mỗi phút) */
export const canRetryConfirm = (s: Pick<InstallationScheduleView, 'status' | 'contractStatus'>) =>
  s.status === 'PLANNED' && s.contractStatus === 'PAID'

export type ScheduleForm = {
  date: string
  startTime: string
  endDate: string
  endTime: string
  agreementNote: string
  reason: string
}

/** "2026-11-29" + "08:00" hiểu là giờ Việt Nam */
export const vnIso = (date: string, time: string) => `${date}T${time}:00+07:00`

/**
 * Lỗi của form hẹn ngày. `changing`: đã có lịch đang hiệu lực, đổi thì bắt buộc lý do. Giờ bắt đầu phải ở tương lai và trước giờ
 * kết thúc; số ngày tối đa của một lần thi công là cài đặt của quản trị nên để backend kiểm
 */
export function scheduleFormErrors(form: ScheduleForm, changing: boolean, now = Date.now()) {
  const errors: Partial<Record<keyof ScheduleForm, string>> = {}
  if (!form.date || !form.startTime) errors.date = 'Chọn ngày và giờ bắt đầu.'
  if (!form.endDate || !form.endTime) errors.endDate = 'Chọn ngày và giờ kết thúc.'
  if (!errors.date && !errors.endDate) {
    const start = Date.parse(vnIso(form.date, form.startTime))
    const end = Date.parse(vnIso(form.endDate, form.endTime))
    if (start <= now) errors.date = 'Giờ bắt đầu phải ở tương lai.'
    if (end <= start) errors.endDate = 'Giờ kết thúc phải sau giờ bắt đầu.'
  }
  const note = form.agreementNote.trim()
  if (!note) errors.agreementNote = 'Ghi khách đồng ý ngày này thế nào và lúc nào.'
  else if (note.length > SCHEDULE_NOTE_MAX) errors.agreementNote = `Tối đa ${SCHEDULE_NOTE_MAX} ký tự.`
  const reason = form.reason.trim()
  if (changing && !reason) errors.reason = 'Ghi lý do đổi ngày.'
  else if (reason.length > SCHEDULE_NOTE_MAX) errors.reason = `Tối đa ${SCHEDULE_NOTE_MAX} ký tự.`
  return errors
}

/** Body gửi lên: đổi lịch đang có thì kèm lý do và `expectedRevision` của lịch đó */
export function scheduleBody(
  form: ScheduleForm,
  live: Pick<InstallationScheduleView, 'revision'> | null,
  technicianUserId?: string | null,
): InstallationScheduleRequest {
  return {
    startsAt: vnIso(form.date, form.startTime),
    endsAt: vnIso(form.endDate, form.endTime),
    customerAgreementNote: form.agreementNote.trim(),
    reason: live ? form.reason.trim() : null,
    expectedRevision: live ? live.revision : null,
    ...(technicianUserId ? { technicianUserId } : {}),
  }
}

/** Ghi chú khách xin đổi ngày: bắt buộc, tối đa 500 ký tự */
export function changeNoteError(text: string) {
  if (!text.trim()) return 'Ghi lý do và những ngày bạn tiện.'
  if (text.trim().length > SCHEDULE_NOTE_MAX) return `Tối đa ${SCHEDULE_NOTE_MAX} ký tự.`
  return null
}

/** Lỗi do lịch vừa đổi ở nơi khác: tải lại rồi để người dùng tự làm lại */
export const isStaleScheduleError = (code: string | null | undefined) =>
  code === 'INSTALLATION_SCHEDULE_STALE_REVISION' || code === 'INSTALLATION_SCHEDULE_NOT_LIVE'

/** Bám InstallationScheduleHandlers.MaxOffers / MaxAvailabilityDays của backend */
export const SLOT_OFFER_MAX = 5
export const AVAILABILITY_MAX_DAYS = 31
export const OFFER_DURATION_MAX_DAYS = 60

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000

/** Lỗi của khoảng ngày xem khung trống: from ≤ to, tối đa 31 ngày, số ngày thi công 1–60 */
export function availabilityRangeErrors(from: string, to: string, durationDays: number) {
  const errors: { range?: string; duration?: string } = {}
  if (!from || !to) errors.range = 'Chọn từ ngày và đến ngày.'
  else if (dayNumber(to) < dayNumber(from)) errors.range = 'Đến ngày phải sau hoặc bằng từ ngày.'
  else if (dayNumber(to) - dayNumber(from) + 1 > AVAILABILITY_MAX_DAYS)
    errors.range = `Xem tối đa ${AVAILABILITY_MAX_DAYS} ngày một lần.`
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > OFFER_DURATION_MAX_DAYS)
    errors.duration = `Số ngày thi công từ 1 đến ${OFFER_DURATION_MAX_DAYS}.`
  return errors
}

type Interval = { startsAt: string; endsAt: string }

/** Vì sao chưa gửi được các khung đã chọn (null là gửi được): 1–5 khung khác nhau, ghi chú ≤ 500 */
export function offerSlotsProblem(slots: Interval[], note = '') {
  if (slots.length === 0) return 'Chọn ít nhất một khung.'
  if (slots.length > SLOT_OFFER_MAX) return `Chọn tối đa ${SLOT_OFFER_MAX} khung.`
  const keys = new Set(slots.map((s) => `${Date.parse(s.startsAt)}-${Date.parse(s.endsAt)}`))
  if (keys.size !== slots.length) return 'Các khung phải khác nhau.'
  if (note.trim().length > SCHEDULE_NOTE_MAX) return `Ghi chú tối đa ${SCHEDULE_NOTE_MAX} ký tự.`
  return null
}

type Offer = Interval & { status: string; available: boolean }

/** Khung khách thấy: chỉ khung đang mở, sớm nhất trước; `choosable` khi backend báo còn trống */
export function customerOfferChoices<T extends Offer>(offers: T[]) {
  return offers
    .filter((o) => o.status === 'OPEN')
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map((offer) => ({ offer, choosable: offer.available }))
}

/** Đề xuất của lần gửi mới nhất còn mở (kỹ thuật viên thấy để biết gửi lại sẽ thay những khung nào) */
export const openOffers = <T extends { status: string }>(offers: T[]) => offers.filter((o) => o.status === 'OPEN')
