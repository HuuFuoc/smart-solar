/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type AttachedFileUrlView = {
  /** Format: uuid */
  id?: string
  url?: string | null
  /** Format: date-time */
  expiresAt?: string
  disposition?: string | null
  contentType?: string | null
  fileName?: string | null
}
