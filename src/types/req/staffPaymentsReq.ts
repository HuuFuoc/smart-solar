/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type CashConfirmationRequest = {
  /** Format: double */
  amount?: number | null
  receiptReference?: string | null
  /** Format: uuid */
  evidenceFileId?: string | null
  note?: string | null
}
