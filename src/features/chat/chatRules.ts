import type { AskChatRequest } from '@/types/req/chatReq'
import type { ChatAnswerView, ChatSessionDetailView, ChatSessionView } from '@/types/res/chatRes'
import { CHAT_LIMITS, CHAT_LIMIT_CODES } from '../../common/chat.ts'

// Luật của chatbot, bám ChatController + ChatService của backend (nhánh cloud RAG 4fb5b95). Chỉ để báo trước khi gửi; backend
// vẫn kiểm lại. Không import giá trị qua "@/" để chạy được bằng node --test

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Từ 90% ngưỡng ký tự thì dấu "!" nhắc sắp chạm giới hạn */
const NEAR_LIMIT = 0.9

/** Mã phiên trên địa chỉ phải là GUID: route của backend là sessions/{sessionId:guid} */
export function isSessionId(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID.test(value)
}

/** Lỗi của câu hỏi trước khi gửi; null là gửi được. Backend tính độ dài sau khi bỏ khoảng trắng hai đầu */
export function chatMessageProblem(text: string, max: number = CHAT_LIMITS.messageMax): string | null {
  const length = text.trim().length
  if (length === 0) return 'Nhập câu hỏi.'
  if (length > max) return `Câu hỏi dài ${length.toLocaleString('vi-VN')} ký tự, tối đa ${max.toLocaleString('vi-VN')}.`
  return null
}

/** Hình dạng lỗi mà các luật dưới đọc (ApiError của services/api/errors.ts) */
type ErrorLike = { code?: string | null; details?: unknown; retryAfter?: number | null }

function errorLike(error: unknown): ErrorLike | null {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : null
}

/** Số không âm, hữu hạn trong `details` của lỗi (swagger không khai kiểu); dạng khác thì null */
export function detailNumber(error: unknown, key: string): number | null {
  const details = errorLike(error)?.details
  if (typeof details !== 'object' || details === null || Array.isArray(details)) return null
  const value = (details as Record<string, unknown>)[key]
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

/** Ngưỡng ký tự sau lỗi RAG_MESSAGE_TOO_LONG: theo `details.maxCharacters` khi backend báo thấp hơn ngưỡng đang dùng */
export function messageMaxAfter(error: unknown, current: number): number {
  if (errorLike(error)?.code !== 'RAG_MESSAGE_TOO_LONG') return current
  const max = detailNumber(error, 'maxCharacters')
  return max !== null && max >= 1 && max < current ? Math.floor(max) : current
}

export type ChatBlockKind = keyof typeof CHAT_LIMIT_CODES
/** Giới hạn vừa chặn câu hỏi; `until` (ms) là lúc backend cho hỏi lại, null khi backend không nói */
export type ChatBlock = { kind: ChatBlockKind; until: number | null }

const BLOCK_KINDS = Object.keys(CHAT_LIMIT_CODES) as ChatBlockKind[]

export function isChatBlockKind(value: unknown): value is ChatBlockKind {
  return BLOCK_KINDS.includes(value as ChatBlockKind)
}

/** Loại giới hạn của lỗi gửi câu; null khi lỗi không phải giới hạn (hiện như lỗi thường) */
export function chatBlockOf(error: unknown, now: number = Date.now()): ChatBlock | null {
  const e = errorLike(error)
  const code = e?.code
  if (!code) return null
  const kind = BLOCK_KINDS.find((k) => (CHAT_LIMIT_CODES[k] as readonly string[]).includes(code))
  if (!kind) return null
  // Giới hạn mỗi phút trả header Retry-After; các giới hạn của trợ lý ghi số giây trong details
  const header = e.retryAfter ?? null
  const detail = detailNumber(error, 'retryAfterSeconds')
  const seconds = code === 'AUTH_TOO_MANY_REQUESTS' ? (header ?? detail) : (detail ?? header)
  if (kind === 'generation-disabled' || seconds === null) return { kind, until: null }
  return { kind, until: now + Math.ceil(seconds) * 1000 }
}

/** Hết lượt, hết hạn mức, quản trị tắt: không tự hết sau vài giây, giữ tới khi có câu trả lời hoặc tới giờ backend hẹn */
export function isLastingBlock(kind: ChatBlockKind) {
  return kind === 'quota-exceeded' || kind === 'budget-exceeded' || kind === 'generation-disabled'
}

/** Giới hạn đã lưu còn hiệu lực lúc `now`; dạng lạ (sửa tay trong bộ nhớ trình duyệt) thì bỏ */
export function activeBlock(value: unknown, now: number): ChatBlock | null {
  if (typeof value !== 'object' || value === null) return null
  const { kind, until } = value as Partial<ChatBlock>
  if (!isChatBlockKind(kind) || !isLastingBlock(kind)) return null
  if (until === null) return { kind, until }
  return typeof until === 'number' && until > now ? { kind, until } : null
}

/**
 * Số giây chờ rồi tự gửi lại đúng câu (cùng `clientMessageId`) khi backend báo câu đó đang được trả lời: gửi lại cùng mã thì
 * nhận câu trả lời đã có, không tính lượt lần nữa. null khi không phải lỗi đó hoặc đã gửi lại đủ số lần
 */
export function inProgressRetryDelay(error: unknown, retriesDone: number): number | null {
  if (errorLike(error)?.code !== 'AI_REQUEST_IN_PROGRESS' || retriesDone >= CHAT_LIMITS.inProgressRetries) return null
  const seconds = detailNumber(error, 'retryAfterSeconds') ?? 2
  return Math.min(30, Math.max(1, Math.ceil(seconds)))
}

export type ChatLimitState =
  | { kind: 'normal'; max: number }
  | { kind: 'near-character-limit' | 'over-character-limit'; length: number; max: number }
  | { kind: 'cooldown'; seconds: number }
  | { kind: 'global-busy'; seconds: number | null }
  | { kind: 'quota-exceeded' | 'budget-exceeded'; until: number | null }
  | { kind: 'generation-disabled' }

/**
 * Trạng thái dấu "!" cạnh ô hỏi. Thứ tự: quản trị tắt / hết hạn mức / hết lượt, rồi đang phải chờ, rồi số ký tự. Các giới hạn
 * chỉ lấy từ lỗi backend vừa trả, FE không tự đếm lượt
 */
export function chatLimitState({
  text,
  max,
  block,
  waitSeconds,
}: {
  text: string
  max: number
  block: ChatBlock | null
  waitSeconds: number
}): ChatLimitState {
  if (block?.kind === 'generation-disabled') return { kind: 'generation-disabled' }
  if (block?.kind === 'budget-exceeded' || block?.kind === 'quota-exceeded')
    return { kind: block.kind, until: block.until }
  if (block?.kind === 'global-busy') return { kind: 'global-busy', seconds: waitSeconds > 0 ? waitSeconds : null }
  if (block?.kind === 'cooldown' && waitSeconds > 0) return { kind: 'cooldown', seconds: waitSeconds }
  const length = text.trim().length
  if (length > max) return { kind: 'over-character-limit', length, max }
  if (length >= Math.ceil(max * NEAR_LIMIT)) return { kind: 'near-character-limit', length, max }
  return { kind: 'normal', max }
}

/** Trạng thái cần người dùng chú ý: dấu "!" đổi màu */
export function isLimitWarning(state: ChatLimitState) {
  return state.kind !== 'normal' && state.kind !== 'near-character-limit'
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
 * trả lại câu đã lưu thay vì tính lượt lần nữa. Từ backend ad10455 câu đầu của phiên mới (chưa có `sessionId`) cũng được chống
 * lặp theo mã này
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
