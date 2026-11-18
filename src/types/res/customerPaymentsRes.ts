/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type PaymentAttemptView = {
  /** Format: uuid */
  paymentAttemptId?: string
  /** Format: uuid */
  contractId?: string | null
  /** Format: int64 */
  orderCode?: number
  /** Format: double */
  amount?: number
  currency?: string | null
  status?: string | null
  checkoutUrl?: string | null
  qrCode?: string | null
  /** Format: date-time */
  expiresAt?: string | null
  /** Format: date-time */
  paidAt?: string | null
  providerReference?: string | null
  failureReason?: string | null
  /** Format: date-time */
  createdAt?: string
  method?: string | null
  /** Format: double */
  amountPaid?: number | null
  /** Format: uuid */
  confirmedByUserId?: string | null
  /** Format: uuid */
  evidenceFileId?: string | null
  confirmationNote?: string | null
}
