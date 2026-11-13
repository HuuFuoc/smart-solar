/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type SalesOutcomeView = {
  /** Format: uuid */
  surveyRequestId?: string
  status?: string | null
  reasonCode?: string | null
  note?: string | null
  /** Format: date-time */
  closedAt?: string
  cancelledQuotationIds?: string[] | null
}
