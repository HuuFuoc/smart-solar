/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type QuotationComponentRequest = {
  /** Format: uuid */
  productId?: string | null
  /** Format: double */
  quantity?: number | null
}

export type TechnicianQuotationLineRequest = {
  /** Format: uuid */
  itemId?: string | null
  components?: QuotationComponentRequest[] | null
  description?: string | null
}

export type TechnicianQuotationRequest = {
  lines?: TechnicianQuotationLineRequest[] | null
  /** Format: int32 */
  repairWarrantyMonths?: number | null
  note?: string | null
}
