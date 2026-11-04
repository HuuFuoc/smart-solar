// Viết tay vì swagger của tag Chat chỉ khai "200 OK". Theo Modules/KnowledgeBase/ChatService.cs của backend `main` (7c79fa8),
// cùng bản với image smartsolar-api build 21/10/2026

/** Một đoạn tài liệu đã công bố được dùng để trả lời. Không có link tải: tài liệu chỉ quản trị đọc được */
export type CitationView = {
  /** Thứ tự từ 1 */
  rank: number
  documentId: string
  documentTitle: string
  versionId: string
  versionNumber: number
  chunkId: string
  page: number | null
  section: string | null
  score: number
  /** Trích đoạn, tối đa 500 ký tự */
  snippet: string | null
}

/** `role`: USER | ASSISTANT. `status`: COMPLETED | INSUFFICIENT_CONTEXT | FAILED */
export type ChatMessageView = {
  messageId: string
  role: string
  content: string
  status: string
  createdAt: string
  citations: CitationView[]
}

/**
 * POST /api/chat/messages. `grounded` = câu trả lời có tài liệu đã công bố hỗ trợ (answer.status COMPLETED); false thì
 * `answer.content` là câu "chưa có đủ tài liệu" của backend và không có nguồn. `notice` luôn có
 */
export type ChatAnswerView = {
  sessionId: string
  question: ChatMessageView
  answer: ChatMessageView
  grounded: boolean
  notice: string
}

/** GET /api/chat/sessions. `title`: 80 ký tự đầu của câu hỏi đầu tiên */
export type ChatSessionView = {
  sessionId: string
  title: string
  createdAt: string
  updatedAt: string
}

/** GET /api/chat/sessions/{sessionId}: tin nhắn theo thời gian, không kèm `grounded` / `notice` */
export type ChatSessionDetailView = {
  session: ChatSessionView
  messages: ChatMessageView[]
}
