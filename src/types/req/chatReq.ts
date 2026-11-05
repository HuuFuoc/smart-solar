/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AskChatRequest = {
  /** Format: uuid */
  sessionId?: string | null
  message?: string | null
  clientMessageId?: string | null
}
