/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type ContractReviewRequest = {
  /** Format: int32 */
  revision?: number
  decision?: string | null
  reason?: string | null
}

export type ContractTermsRequest = {
  /** Format: int32 */
  revision?: number | null
  terms?: string | null
  /** Format: int32 */
  warrantyMonths?: number | null
}

export type OfficialDocumentRequest = {
  /** Format: int32 */
  revision?: number
  /** Format: uuid */
  fileId?: string
  canonicalHash?: string | null
}
