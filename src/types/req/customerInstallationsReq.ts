/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type CustomerAcceptanceRequest = {
  decision?: string | null
  reason?: string | null
  evidenceFileIds?: string[] | null
  /** Format: int32 */
  expectedRevision?: number | null
}
