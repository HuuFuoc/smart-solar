// Enum và giới hạn của chatbot (ChatService, KnowledgeEntities của Modules.KnowledgeBase). Backend vẫn kiểm lại mọi giới hạn

/** ChatRoles */
export const CHAT_ROLES = {
  USER: 'USER',
  ASSISTANT: 'ASSISTANT',
} as const

/**
 * ChatMessageStatuses. COMPLETED của câu trả lời = có tài liệu đã công bố hỗ trợ; INSUFFICIENT_CONTEXT = chưa có tài liệu nào
 * hỗ trợ (nội dung là câu xin lỗi của backend, không có nguồn)
 */
export const CHAT_MESSAGE_STATUSES = {
  COMPLETED: 'COMPLETED',
  INSUFFICIENT_CONTEXT: 'INSUFFICIENT_CONTEXT',
  FAILED: 'FAILED',
} as const

/**
 * Rag.MaxQuestionCharacters, ChatController. Số lần hỏi mỗi phút, số câu mỗi ngày, số câu cùng lúc và ngân sách là cấu hình của
 * backend nên không ghi ở đây: FE chỉ đọc lỗi trả về
 */
export const CHAT_LIMITS = {
  /**
   * Số ký tự của câu hỏi sau khi bỏ khoảng trắng hai đầu. Quản trị chỉnh được trong khoảng 100–2000; ngưỡng thấp hơn thì
   * 400 RAG_MESSAGE_TOO_LONG trả `details.maxCharacters` và FE dùng số đó
   */
  messageMax: 1000,
  clientMessageIdMax: 64,
  /** Số lần tự gửi lại khi backend báo câu này đang được trả lời (AI_REQUEST_IN_PROGRESS) */
  inProgressRetries: 3,
} as const

/** Lỗi giới hạn khi gửi câu hỏi, theo mã backend; mã AI_* nội bộ được gộp về đúng loại */
export const CHAT_LIMIT_CODES = {
  cooldown: ['AUTH_TOO_MANY_REQUESTS', 'RAG_TOO_MANY_CONCURRENT_REQUESTS', 'AI_CONCURRENCY_LIMIT'],
  'quota-exceeded': ['RAG_QUOTA_EXCEEDED', 'AI_USER_QUOTA_EXCEEDED', 'AI_GLOBAL_TOKEN_QUOTA'],
  'global-busy': ['AI_GLOBAL_CONCURRENCY_LIMIT'],
  'budget-exceeded': ['AI_BUDGET_EXCEEDED'],
  'generation-disabled': ['AI_GENERATION_DISABLED'],
} as const
