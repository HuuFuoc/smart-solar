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
 * Rag.MaxQuestionCharacters, ChatController. Giới hạn số lần (mặc định 10 câu / phút, 100 câu và 200 000 token / ngày / người,
 * 2 câu trả lời cùng lúc) là cấu hình của backend nên không ghi ở đây: FE chỉ đọc lỗi 429 trả về
 */
export const CHAT_LIMITS = {
  /** Số ký tự của câu hỏi sau khi bỏ khoảng trắng hai đầu */
  messageMax: 8000,
  clientMessageIdMax: 64,
} as const
