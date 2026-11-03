/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type FollowUpRequest = {
  /** Format: date-time */
  contactedAt?: string
  result?: string | null
  note?: string | null
  outcome?: string | null
}

export type IssueQuotationRequest = {
  lines?: QuotationLineRequest[] | null
  /** Format: int32 */
  repairWarrantyMonths?: number | null
  note?: string | null
}

export type QuotationLineRequest = {
  /** Format: uuid */
  itemId?: string | null
  description?: string | null
  /** Format: double */
  partsAmount?: number
  /** Format: double */
  laborAmount?: number
}
