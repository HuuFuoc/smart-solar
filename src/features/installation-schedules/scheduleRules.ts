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
