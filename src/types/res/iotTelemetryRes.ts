/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type IotIngestView = {
  /** Format: uuid */
  readingId?: string
  /** Format: date-time */
  receivedAt?: string
  /** Format: double */
  currentAmps?: number
  connectionStatus?: string | null
}
