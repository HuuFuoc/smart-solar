import type { Tone } from '@/components/common/ui/badge'
import { CHAT_MESSAGE_STATUSES } from '@/common/chat'
import { chatBlockOf, detailNumber, type ChatLimitState } from '@/features/chat/chatRules'
import { formatDay, formatTime, vnDate } from '@/features/scheduling/schedulingDisplay'
import { errorMessage, isApiError } from '@/services/api/errors'
import type { CitationView, ChatMessageView } from '@/types/res/chatRes'

// Nhãn và câu chữ của chatbot, dùng chung mọi cổng

/** Nhãn dưới câu trả lời. Có tài liệu hỗ trợ thì không gắn nhãn, chỉ hiện nguồn */
export function answerStateMeta(message: Pick<ChatMessageView, 'status'>): { label: string; tone: Tone } | null {
  if (message.status === CHAT_MESSAGE_STATUSES.INSUFFICIENT_CONTEXT)
    return { label: 'Chưa có tài liệu đã công bố hỗ trợ câu trả lời này', tone: 'warn' }
  if (message.status === CHAT_MESSAGE_STATUSES.FAILED) return { label: 'Không trả lời được', tone: 'neutral' }
  return null
}

/** "Phiên bản 2, trang 5, mục Điều kiện bảo hành" */
export function citationMeta(c: Pick<CitationView, 'versionNumber' | 'page' | 'section'>) {
  const parts = [`Phiên bản ${c.versionNumber}`]
  if (c.page !== null) parts.push(`trang ${c.page}`)
  if (c.section) parts.push(`mục ${c.section}`)
  return parts.join(', ')
}

const count = (n: number) => n.toLocaleString('vi-VN')

/** "Thử lại từ 07:00, Thứ Tư, 18/11/2026." theo giờ backend hẹn */
function retryAt(until: number | null) {
  if (until === null) return ''
  const iso = new Date(until).toISOString()
  return `Thử lại từ ${formatTime(iso)}, ${formatDay(vnDate(iso), { year: true })}.`
}

const withRetry = (message: string, until: number | null) => (until === null ? message : `${message} ${retryAt(until)}`)

/**
 * Câu báo lỗi khi gửi, dưới ô hỏi. Câu gốc theo mã ở `errors.ts`, thêm giờ hỏi lại khi backend có nói. Không ghi số lượt hay
 * hạn mức: quản trị cấu hình được, FE không biết số đang dùng
 */
export function chatSendError(error: unknown, now: number = Date.now()) {
  if (!isApiError(error)) return errorMessage(error)
  if (error.code === 'RAG_MESSAGE_TOO_LONG') {
    const max = detailNumber(error, 'maxCharacters')
    return max ? `Câu hỏi dài quá số ký tự cho phép (tối đa ${count(max)}). Rút gọn rồi gửi lại.` : error.message
  }
  const block = chatBlockOf(error, now)
  if (!block) return error.message
  const seconds = block.until === null ? null : Math.max(1, Math.round((block.until - now) / 1000))
  if (error.code === 'AUTH_TOO_MANY_REQUESTS')
    return seconds ? `Bạn hỏi nhanh quá. Hỏi tiếp sau ${seconds} giây.` : 'Bạn hỏi nhanh quá. Chờ một lát rồi hỏi tiếp.'
  if (block.kind === 'global-busy' && seconds) return `${error.message} Thử lại sau ${seconds} giây.`
  if (block.kind === 'quota-exceeded' || block.kind === 'budget-exceeded') return withRetry(error.message, block.until)
  return error.message
}

/** Số ký tự cạnh ô hỏi ("82 / 1.000"), hiện khi đã gõ */
export function messageCounter(text: string, max: number) {
  const length = text.trim().length
  if (length === 0) return null
  return {
    text: `${count(length)} / ${count(max)}`,
    label: `Đã gõ ${count(length)} trên ${count(max)} ký tự`,
    over: length > max,
  }
}

/** Nội dung của dấu "!" cạnh ô hỏi. Không có số lượt còn lại: backend không cho người dùng xem */
export function chatLimitText(state: ChatLimitState) {
  switch (state.kind) {
    case 'normal':
      return `Trợ lý giới hạn số câu hỏi và số lần gửi để mọi người cùng dùng được. Mỗi câu hỏi tối đa ${count(state.max)} ký tự. Quản trị có thể đổi các giới hạn này.`
    case 'near-character-limit':
      return `Bạn đang dùng ${count(state.length)} / ${count(state.max)} ký tự.`
    case 'over-character-limit':
      return `Bạn đang dùng ${count(state.length)} / ${count(state.max)} ký tự. Rút gọn câu hỏi trước khi gửi.`
    case 'cooldown':
      return `Bạn đã gửi câu hỏi quá nhanh. Hỏi tiếp được sau ${state.seconds} giây.`
    case 'global-busy':
      return state.seconds
        ? `Trợ lý đang bận trả lời nhiều người. Thử lại sau ${state.seconds} giây.`
        : 'Trợ lý đang bận trả lời nhiều người. Thử lại sau ít phút.'
    case 'quota-exceeded':
      return withRetry('Bạn đã dùng hết lượt hỏi trợ lý hiện tại.', state.until)
    case 'budget-exceeded':
      return withRetry('Trợ lý tạm ngưng trả lời vì đã chạm hạn mức chung của hệ thống.', state.until)
    case 'generation-disabled':
      return 'Trợ lý đang tạm ngưng trả lời theo cài đặt của quản trị. Câu hỏi tư vấn cấu hình (diện tích, ngân sách, điện tiêu thụ) vẫn hỏi được.'
  }
}

/** Lỗi khiến trang chưa dùng được: chức năng chưa bật hoặc hệ thống đang cập nhật */
export const CHAT_UNAVAILABLE = 'Trợ lý chưa được bật trên hệ thống. Liên hệ quản trị hệ thống.'
export const CHAT_UNAVAILABLE_ADMIN =
  'Trợ lý chưa được bật trên hệ thống. Khi bật, trợ lý chỉ trả lời theo tài liệu đã công bố trong Kho tri thức AI.'
