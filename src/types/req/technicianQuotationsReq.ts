/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type CartLineQuantityRequest = {
  /** Format: int32 */
  revision?: number | null
  /** Format: double */
  quantity?: number
}

export type CartLineRequest = {
  /** Format: int32 */
  revision?: number | null
  /** Format: uuid */
  productId?: string | null
  /** Format: double */
  quantity?: number
}

export type OnSiteDecisionRequest = {
  decision?: string | null
  /** Format: int32 */
  revision?: number | null
  note?: string | null
}

export type QuotationPaymentRequest = {
  method?: string | null
}

export type TechnicianCartCreateRequest = {
  notes?: string | null
}
