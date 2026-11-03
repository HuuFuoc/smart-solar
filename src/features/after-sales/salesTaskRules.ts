import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

// Luật hàng việc sau bán của kinh doanh, bám SalesTaskHandlers của backend (StartAsync, RecordFollowUpAsync). Chỉ để bật / tắt
// nút và báo lỗi trước khi gửi; backend vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

/** Kết quả liên hệ: backend bắt buộc, cắt ở 300 ký tự */
export const FOLLOW_UP_RESULT_MAX = 300
/** Ghi chú: lịch sử giữ 1000 ký tự đầu */
export const FOLLOW_UP_NOTE_MAX = 1000

/** FollowUpOutcomes. WILL_BOOK_LATER giữ việc mở, các kết quả khác đóng việc */
export const FOLLOW_UP_OUTCOME_CODES = ['BOOKED', 'WILL_BOOK_LATER', 'DECLINED', 'UNREACHABLE'] as const

export const isFollowUpTask = (t: Pick<SalesTaskView, 'taskType'>) =>
  t.taskType === 'MAINTENANCE_FOLLOW_UP' || t.taskType === 'ACCEPTANCE_FOLLOW_UP'

/** Chỉ việc mình đã nhận mà chưa bắt đầu (CLAIMED → IN_PROGRESS) */
export const canStartTask = (t: Pick<SalesTaskView, 'status'>) => t.status === 'CLAIMED'

/** Ghi liên hệ: việc nhắc mình đang giữ, còn mở (việc báo giá xong bằng cách gửi báo giá) */
export const canRecordFollowUp = (t: Pick<SalesTaskView, 'taskType' | 'status'>) =>
  isFollowUpTask(t) && (t.status === 'CLAIMED' || t.status === 'IN_PROGRESS')

/** Kết quả này đóng việc */
export const closesTask = (outcome: string) => outcome !== '' && outcome !== 'WILL_BOOK_LATER'

export type FollowUpInput = {
  /** Ngày giờ liên hệ theo giờ Việt Nam, "2026-11-03T09:30:00+07:00"; rỗng khi chưa chọn */
  contactedAt: string
  result: string
  note: string
  outcome: string
}

/** Lỗi theo ô; rỗng là gửi được. `now` để test */
export function followUpErrors(input: FollowUpInput, now = Date.now()) {
  const errors: Partial<Record<keyof FollowUpInput, string>> = {}
  const at = input.contactedAt ? Date.parse(input.contactedAt) : Number.NaN
  if (Number.isNaN(at)) errors.contactedAt = 'Chọn ngày giờ đã liên hệ khách.'
  else if (at > now + 60_000) errors.contactedAt = 'Thời điểm liên hệ chưa tới; chọn lúc đã gọi xong.'
  if (!input.result.trim()) errors.result = 'Ghi kết quả của lần liên hệ.'
  else if (input.result.trim().length > FOLLOW_UP_RESULT_MAX)
    errors.result = `Kết quả tối đa ${FOLLOW_UP_RESULT_MAX} ký tự.`
  if (input.note.trim().length > FOLLOW_UP_NOTE_MAX) errors.note = `Ghi chú tối đa ${FOLLOW_UP_NOTE_MAX} ký tự.`
  if (input.outcome && !(FOLLOW_UP_OUTCOME_CODES as readonly string[]).includes(input.outcome))
    errors.outcome = 'Chọn một kết quả trong danh sách.'
  return errors
}

/** Body gửi lên: ô trống thành null, bỏ `outcome` khi chưa có kết quả cuối */
export function followUpBody(input: FollowUpInput) {
  return {
    contactedAt: input.contactedAt,
    result: input.result.trim(),
    note: input.note.trim() || null,
    outcome: input.outcome || null,
  }
}

/** Ghi chú hệ thống tự tạo khi mở việc nhắc (câu tiếng Anh của backend), dịch theo mẫu; ghi chú của người thì giữ nguyên */
export function taskNoteText(note: string | null | undefined) {
  if (!note) return null
  const month = /^No booking yet for plan month (\d+); contact the customer\.$/.exec(note)
  if (month) return `Khách chưa đặt lịch lượt bảo trì tháng thứ ${month[1]} của gói.`
  if (note === 'The customer has not answered the completion yet.')
    return 'Khách chưa trả lời kết quả sửa chữa / bảo trì.'
  return note
}
