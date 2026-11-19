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

/** Hợp đồng còn hiệu lực (không bị thay bằng phụ lục, không bị huỷ bản nháp) */
const LIVE_CONTRACT = ['DRAFT', 'ISSUED', 'AWAITING_SIGNATURE', 'UNDER_REVIEW', 'SIGNATURE_REJECTED', 'SIGNED', 'PAID']

/**
 * Hẹn ngày được khi hợp đồng đã ký / đã thanh toán (luồng cũ), hoặc hợp đồng lập từ báo giá đã thanh toán tại công trình
 * (`paymentCompleted`) ở bất kỳ trạng thái còn hiệu lực nào: trả tiền trước, ký sau
 */
export const canPlanForContract = (contractStatus: string, paymentCompleted = false) =>
  contractStatus === 'SIGNED' ||
  contractStatus === 'PAID' ||
  (paymentCompleted && LIVE_CONTRACT.includes(contractStatus))

/** Hợp đồng 30/70 hẹn được ngày từ khi khoản 30% được xác minh; xác nhận lịch khi đã ký giấy (SIGNED) */
const PLAN_SCHEDULABLE = ['AWAITING_SIGNATURE', 'SIGNED', 'PAID']

/**
 * Hợp đồng hẹn ngày thi công được, đúng `Schedulable` của backend 7d27054: hợp đồng 30/70 khi đã nhận 30% (AWAITING_SIGNATURE,
 * SIGNED, PAID; chưa ký giấy thì lịch chỉ là dự kiến); hợp đồng cũ như `canPlanForContract`. Không bắt trả đủ 100%
 */
export function isSchedulableContract(
  c: { status: string; paymentCompleted?: boolean | null } & { paymentPlan?: object | null },
) {
  if (c.paymentPlan) return PLAN_SCHEDULABLE.includes(c.status)
  return canPlanForContract(c.status, c.paymentCompleted === true)
}

/**
 * Vì sao lịch dự kiến chưa xác nhận. `awaitingContractSignature`: đã nhận tiền (30% với hợp đồng 30/70), chờ hợp đồng ký xong
 * (30/70: chốt đủ trang hợp đồng giấy; hợp đồng trả trước cũ: duyệt bản ký); `awaitingPayment`: hợp đồng cũ chưa thanh toán. Hai
 * cờ do backend tính; không có cờ nào là hợp đồng đã xong, hệ thống đang xác nhận
 */
export function plannedWaitReason(
  s: Pick<InstallationScheduleView, 'status' | 'awaitingPayment' | 'awaitingContractSignature'>,
) {
  if (s.status !== 'PLANNED') return null
  if (s.awaitingContractSignature) return 'signature' as const
  if (s.awaitingPayment) return 'payment' as const
  return 'confirming' as const
}

/** Dự án thi công đã bắt đầu / đã huỷ thì không đổi lịch ở đây (INSTALLATION_SCHEDULE_INSTALLATION_STARTED) */
const STARTED_PROJECT = ['IN_PROGRESS', 'REWORK_REQUIRED', 'PENDING_CUSTOMER_ACCEPTANCE', 'COMPLETED', 'CANCELLED']
export const projectLocksSchedule = (projectStatus: string | null | undefined) =>
  projectStatus != null && STARTED_PROJECT.includes(projectStatus)

/** Huỷ ở đây chỉ lịch dự kiến hoặc phải hẹn lại; lịch đã xác nhận là phân công của dự án thi công, quản lý xử lý trên dự án */
export const canCancelSchedule = (s: Schedule) => s.status === 'PLANNED' || s.status === 'RESCHEDULE_REQUIRED'

/** Khách xin đổi ngày: lịch đang hiệu lực và dự án chưa bắt đầu thi công */
export const canRequestChange = (s: Pick<InstallationScheduleView, 'status' | 'projectStatus'>) =>
  isLiveSchedule(s) && !projectLocksSchedule(s.projectStatus)

/**
 * Quản lý thử xác nhận lại lịch dự kiến (backend tự thử mỗi phút) khi hợp đồng đã sẵn sàng thi công: hợp đồng cũ khi PAID; hợp
 * đồng 30/70 khi đã ký giấy (SIGNED, backend 7d27054). Lịch không mang gói thanh toán nên SIGNED chỉ tính khi backend báo rõ không
 * còn chờ tiền (`awaitingPayment` false: hợp đồng cũ SIGNED luôn true) và không còn chờ ký
 */
export const canRetryConfirm = (
  s: Pick<InstallationScheduleView, 'status' | 'contractStatus'> &
    Partial<Pick<InstallationScheduleView, 'awaitingPayment' | 'awaitingContractSignature'>>,
) =>
  s.status === 'PLANNED' &&
  (s.contractStatus === 'PAID' ||
    (s.contractStatus === 'SIGNED' && s.awaitingPayment === false && s.awaitingContractSignature === false))

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

/** Bám InstallationScheduleHandlers.MaxAvailabilityDays của backend */
export const AVAILABILITY_MAX_DAYS = 31
export const AVAILABILITY_DURATION_MAX_DAYS = 60

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000

/** Lỗi của khoảng ngày xem khung trống: from ≤ to, tối đa 31 ngày, số ngày thi công 1–60 */
export function availabilityRangeErrors(from: string, to: string, durationDays: number) {
  const errors: { range?: string; duration?: string } = {}
  if (!from || !to) errors.range = 'Chọn từ ngày và đến ngày.'
  else if (dayNumber(to) < dayNumber(from)) errors.range = 'Đến ngày phải sau hoặc bằng từ ngày.'
  else if (dayNumber(to) - dayNumber(from) + 1 > AVAILABILITY_MAX_DAYS)
    errors.range = `Xem tối đa ${AVAILABILITY_MAX_DAYS} ngày một lần.`
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > AVAILABILITY_DURATION_MAX_DAYS)
    errors.duration = `Số ngày thi công từ 1 đến ${AVAILABILITY_DURATION_MAX_DAYS}.`
  return errors
}

const vnParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "2026-11-25" và "08:00" theo giờ Việt Nam của một mốc ISO, bất kể múi giờ của máy */
export function vnDateTime(iso: string) {
  const parts = Object.fromEntries(vnParts.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

/** Khung trống đã chọn đổ vào các ô ngày giờ của form hẹn ngày (khung không giữ chỗ, backend kiểm lại lúc ghi) */
export function slotToForm(slot: {
  startsAt: string
  endsAt: string
}): Pick<ScheduleForm, 'date' | 'startTime' | 'endDate' | 'endTime'> {
  const start = vnDateTime(slot.startsAt)
  const end = vnDateTime(slot.endsAt)
  return { date: start.date, startTime: start.time, endDate: end.date, endTime: end.time }
}
