/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type ContractDiscardView = {
  /** Format: date-time */
  discardedAt?: string
  /** Format: uuid */
  discardedByUserId?: string
  reason?: string | null
}

export type ContractDocumentView = {
  /** Format: uuid */
  fileId?: string
  sha256?: string | null
  /** Format: date-time */
  confirmedAt?: string | null
}

export type ContractEventView = {
  eventType?: string | null
  fromStatus?: string | null
  toStatus?: string | null
  /** Format: uuid */
  actorUserId?: string
  detail?: string | null
  /** Format: date-time */
  createdAt?: string
}

export type ContractView = {
  /** Format: uuid */
  contractId?: string
  contractNumber?: string | null
  /** Format: int32 */
  version?: number
  /** Format: uuid */
  previousContractId?: string | null
  /** Format: uuid */
  quotationId?: string
  /** Format: int32 */
  quotationVersion?: number
  /** Format: uuid */
  surveyRequestId?: string
  status?: string | null
  currency?: string | null
  /** Format: double */
  totalAmount?: number
  pricingSnapshot?: unknown
  customerSnapshot?: unknown
  terms?: string | null
  canonicalHash?: string | null
  officialDocument?: ContractDocumentView
  signedDocument?: ContractDocumentView
  rejectionReason?: string | null
  /** Format: date-time */
  issuedAt?: string | null
  /** Format: date-time */
  publishedAt?: string | null
  /** Format: date-time */
  signedAt?: string | null
  /** Format: date-time */
  paidAt?: string | null
  /** Format: int32 */
  revision?: number
  submissions?: SignatureSubmissionView[] | null
  events?: ContractEventView[] | null
  /** Format: int32 */
  warrantyMonths?: number | null
  discard?: ContractDiscardView
}

export type SignatureSubmissionView = {
  /** Format: uuid */
  submissionId?: string
  /** Format: uuid */
  fileId?: string
  fileSha256?: string | null
  officialDocumentSha256?: string | null
  /** Format: date-time */
  submittedAt?: string
  outcome?: string | null
  /** Format: date-time */
  reviewedAt?: string | null
  rejectionReason?: string | null
}
