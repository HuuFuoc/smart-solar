/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */
import type { InstallmentAllocation, SignatureSetView } from '@/types/res/contractDirectoryRes'

export type CollectionCaseSummaryView = {
  /** Format: uuid */
  caseId?: string
  /** Format: uuid */
  installmentId?: string
  status?: string | null
  /** Format: date-time */
  openedAt?: string
  /** Format: date-time */
  dueAt?: string
  /** Format: double */
  amountDue?: number
  /** Format: date */
  promisedPaymentDate?: string | null
  /** Format: date-time */
  resolvedAt?: string | null
  resolution?: string | null
}

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

export type ContractPaymentPlanView = {
  plan?: string | null
  termsVersion?: string | null
  stage?: string | null
  /** Format: double */
  total?: number
  /** Format: double */
  paid?: number
  /** Format: double */
  outstanding?: number
  depositPaid?: boolean
  paperSigned?: boolean
  readyForInstallation?: boolean
  fullyPaid?: boolean
  overdue?: boolean
  /** Format: date-time */
  nextDueAt?: string | null
  ownershipStatus?: string | null
  termsPendingLegalReview?: boolean
  legalReviewRequired?: boolean
  installments?: InstallmentView[] | null
  signature?: SignatureSetView
  collection?: CollectionCaseSummaryView[] | null
}

export type ContractServicePackageView = {
  /** Format: uuid */
  commitmentId?: string
  kind?: string | null
  /** Format: uuid */
  packageId?: string
  packageName?: string | null
  description?: string | null
  imageUrl?: string | null
  pricingUnit?: string | null
  /** Format: double */
  unitPrice?: number
  /** Format: int32 */
  quantity?: number
  /** Format: double */
  totalAmount?: number
  /** Format: int32 */
  durationMonths?: number
  visitMonths?: number[] | null
  coveredDisasterTypes?: string[] | null
  /** Format: double */
  coveragePercent?: number | null
  /** Format: double */
  perIncidentLimit?: number | null
  /** Format: double */
  termLimit?: number | null
  /** Format: int32 */
  catalogRevision?: number
  /** Format: date-time */
  snapshotAt?: string
  /** Format: double */
  depositAllocation?: number
  /** Format: double */
  balanceAllocation?: number
  status?: string | null
  statusReason?: string | null
  /** Format: uuid */
  subscriptionId?: string | null
  /** Format: date-time */
  statusChangedAt?: string | null
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
  paymentCompleted?: boolean
  /** Format: uuid */
  paymentAttemptId?: string | null
  /** Format: date-time */
  paymentConfirmedAt?: string | null
  paymentPlan?: ContractPaymentPlanView
  /** Format: double */
  installationTotal?: number | null
  /** Format: double */
  servicePackagesTotal?: number | null
  servicePackages?: ContractServicePackageView[] | null
}

export type InstallmentView = {
  /** Format: uuid */
  installmentId?: string
  /** Format: int32 */
  sequence?: number
  kind?: string | null
  /** Format: double */
  percent?: number
  /** Format: double */
  amount?: number
  status?: string | null
  /** Format: date-time */
  openedAt?: string | null
  /** Format: date-time */
  dueAt?: string | null
  overdue?: boolean
  /** Format: date-time */
  paidAt?: string | null
  /** Format: double */
  paidAmount?: number | null
  paidLate?: boolean
  /** Format: uuid */
  settledPaymentAttemptId?: string | null
  allocation?: InstallmentAllocation
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
