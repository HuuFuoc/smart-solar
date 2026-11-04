import type { Tone } from '@/components/common/ui/badge'
import { CHAT_LIMITS, CHAT_MESSAGE_STATUSES } from '@/common/chat'
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

/**
 * Câu báo lỗi khi gửi. 429 của giới hạn mỗi phút (AUTH_TOO_MANY_REQUESTS) có Retry-After; hết lượt trong ngày
 * (RAG_QUOTA_EXCEEDED) và đang trả lời câu khác thì không. Không ghi số giới hạn: backend cấu hình được
 */
export function chatSendError(error: unknown) {
  if (isApiError(error) && error.status === 429 && error.code === 'AUTH_TOO_MANY_REQUESTS')
    return error.retryAfter
      ? `Bạn hỏi nhanh quá. Hỏi tiếp sau ${error.retryAfter} giây.`
      : 'Bạn hỏi nhanh quá. Chờ một lát rồi hỏi tiếp.'
  return errorMessage(error)
}

/** Đếm ký tự để hiện cạnh ô nhập khi gần chạm giới hạn */
export function messageCounter(text: string) {
  const length = text.trim().length
  if (length < CHAT_LIMITS.messageMax * 0.9) return null
  return {
    text: `${length.toLocaleString('vi-VN')} / ${CHAT_LIMITS.messageMax.toLocaleString('vi-VN')} ký tự`,
    over: length > CHAT_LIMITS.messageMax,
  }
}

/** Lỗi khiến trang chưa dùng được: chức năng chưa bật hoặc hệ thống đang cập nhật */
export const CHAT_UNAVAILABLE = 'Trợ lý chưa được bật trên hệ thống. Liên hệ quản trị hệ thống.'
export const CHAT_UNAVAILABLE_ADMIN =
  'Trợ lý chưa được bật trên hệ thống. Khi bật, trợ lý chỉ trả lời theo tài liệu đã công bố trong Kho tri thức AI.'
