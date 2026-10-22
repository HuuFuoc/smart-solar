/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type FileReferenceRequest = {
  /** Format: uuid */
  fileId?: string
}

export type InstallationQuotationLineRequest = {
  /** Format: int32 */
  revision?: number
  /** Format: uuid */
  productId?: string | null
  name?: string | null
  unit?: string | null
  /** Format: double */
  quantity?: number
  /** Format: double */
  unitPrice?: number | null
  description?: string | null
}

export type QuotationHeaderRequest = {
  /** Format: int32 */
  revision?: number | null
  /** Format: double */
  laborCost?: number
  /** Format: double */
  transportCost?: number
  /** Format: double */
  otherServiceCost?: number
  /** Format: double */
  discountAmount?: number
  /** Format: double */
  taxRatePercent?: number | null
  validUntil?: string | null
  terms?: string | null
  notes?: string | null
}

export type QuotationLineUpdateRequest = {
  /** Format: int32 */
  revision?: number
  /** Format: double */
  quantity?: number
  /** Format: double */
  unitPrice?: number | null
  description?: string | null
}

export type RevisionRequest = {
  /** Format: int32 */
  revision?: number
}
