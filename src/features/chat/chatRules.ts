import type { AskChatRequest } from '@/types/req/chatReq'
import type { ChatAnswerView, ChatSessionDetailView, ChatSessionView } from '@/types/res/chatRes'
import { CHAT_LIMITS } from '../../common/chat.ts'

// Luật của chatbot, bám ChatController + ChatService của backend `main` (7c79fa8). Chỉ để báo trước khi gửi; backend vẫn kiểm
// lại. Không import giá trị qua "@/" để chạy được bằng node --test

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Mã phiên trên địa chỉ phải là GUID: route của backend là sessions/{sessionId:guid} */
export function isSessionId(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID.test(value)
}

/** Lỗi của câu hỏi trước khi gửi; null là gửi được. Backend tính độ dài sau khi bỏ khoảng trắng hai đầu */
export function chatMessageProblem(text: string): string | null {
  const length = text.trim().length
  if (length === 0) return 'Nhập câu hỏi.'
  if (length > CHAT_LIMITS.messageMax)
    return `Câu hỏi dài ${length.toLocaleString('vi-VN')} ký tự, tối đa ${CHAT_LIMITS.messageMax.toLocaleString('vi-VN')}.`
  return null
}

/** Mã của một lần gửi (36 ký tự, dưới giới hạn 64). Trang không an toàn (http lạ) không có randomUUID thì tự dựng */
export function newClientMessageId(random: Crypto = globalThis.crypto): string {
  if (typeof random.randomUUID === 'function') return random.randomUUID()
  const bytes = random.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export type ChatAttempt = { text: string; sessionId: string | null; clientMessageId: string }

/**
 * Thân lệnh gửi. Gửi lại đúng câu đó trong đúng phiên vừa lỗi thì dùng lại mã cũ: nếu lần trước backend đã trả lời xong, nó
 * trả lại câu đã lưu thay vì tính lượt lần nữa. Backend chỉ chống lặp khi đã có phiên; câu đầu của phiên mới không được
 * chống lặp
 */
export function nextAttempt(
  text: string,
  sessionId: string | null,
  previous: ChatAttempt | null,
  makeId: () => string = newClientMessageId,
): { attempt: ChatAttempt; body: AskChatRequest } {
  const message = text.trim()
  const reuse = previous !== null && previous.text === message && previous.sessionId === sessionId
  const attempt = { text: message, sessionId, clientMessageId: reuse ? previous.clientMessageId : makeId() }
  return { attempt, body: { message, sessionId, clientMessageId: attempt.clientMessageId } }
}

/** Phiên mới cập nhật lên đầu */
export function sortSessions(list: readonly ChatSessionView[]): ChatSessionView[] {
  return [...list].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

/**
 * Ghép câu hỏi và câu trả lời backend vừa trả vào nội dung phiên đang giữ, bỏ tin đã có (lần gửi lại trả về đúng tin cũ).
 * Chỉ dùng tin thật của backend; khác phiên thì giữ nguyên
 */
export function mergeExchange(detail: ChatSessionDetailView, answer: ChatAnswerView): ChatSessionDetailView {
  if (detail.session.sessionId !== answer.sessionId) return detail
  const known = new Set(detail.messages.map((m) => m.messageId))
  const added = [answer.question, answer.answer].filter((m) => !known.has(m.messageId))
  if (added.length === 0) return detail
  const updatedAt =
    Date.parse(answer.answer.createdAt) > Date.parse(detail.session.updatedAt)
      ? answer.answer.createdAt
      : detail.session.updatedAt
  return { session: { ...detail.session, updatedAt }, messages: [...detail.messages, ...added] }
}
