import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { AskChatRequest } from '@/types/req/chatReq'
import type { ChatAnswerView, ChatSessionDetailView, ChatSessionView } from '@/types/res/chatRes'

// Chatbot (tag Chat). Trình duyệt chỉ gọi API của Smart Solar; dịch vụ RAG và khoá của nó nằm sau backend

/** Hỏi một câu. Không có `sessionId` thì backend mở phiên mới; `clientMessageId` chỉ chống lặp trong một phiên đã có */
export function askChat(body: AskChatRequest) {
  return post<ChatAnswerView>(ENDPOINTS.chat.messages, body)
}

export function getChatSessions() {
  return get<ChatSessionView[]>(ENDPOINTS.chat.sessions)
}

export function getChatSession(sessionId: string) {
  return get<ChatSessionDetailView>(ENDPOINTS.chat.session(sessionId))
}
