/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type CollectionActivityRequest = {
  kind?: string | null
  channel?: string | null
  summary?: string | null
  /** Format: date */
  promisedPaymentDate?: string | null
  evidenceFileIds?: string[] | null
  /** Format: int32 */
  expectedRevision?: number | null
}

export type CollectionDecisionRequest = {
  reason?: string | null
  /** Format: int32 */
  expectedRevision?: number | null
}
