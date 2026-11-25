/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */
import type { PaymentAttemptView } from '@/types/res/customerPaymentsRes'

export type ContractDirectoryItem = {
  /** Format: uuid */
  contractId?: string
  contractNumber?: string | null
  /** Format: int32 */
  version?: number
  status?: string | null
  paymentPlan?: string | null
  stage?: string | null
  /** Format: uuid */
  customerUserId?: string
  customerName?: string | null
  customerPhone?: string | null
  /** Format: uuid */
  surveyRequestId?: string
  /** Format: uuid */
  propertySiteId?: string | null
  propertyName?: string | null
  /** Format: uuid */
  quotationId?: string
  /** Format: uuid */
  projectId?: string | null
  projectStatus?: string | null
  /** Format: double */
  totalAmount?: number
  /** Format: double */
  paid?: number
  /** Format: double */
  outstanding?: number
  depositPaid?: boolean
  fullyPaid?: boolean
  overdue?: boolean
  /** Format: date-time */
  nextDueAt?: string | null
  ownershipStatus?: string | null
  /** Format: date-time */
  createdAt?: string
}

export type ContractDirectoryItemPagedResult = {
  items?: ContractDirectoryItem[] | null
  /** Format: int32 */
  page?: number
  /** Format: int32 */
  pageSize?: number
  /** Format: int32 */
  totalItems?: number
  /** Format: int32 */
  totalPages?: number
}

export type InstallmentAllocation = {
  /** Format: int32 */
  sequence?: number
  /** Format: double */
  amount?: number
  /** Format: double */
  installation?: number
  /** Format: double */
  maintenancePackages?: number
  /** Format: double */
  disasterPackages?: number
}

export type InstallmentPaymentView = {
  /** Format: uuid */
  contractId?: string
  contractNumber?: string | null
  /** Format: uuid */
  installmentId?: string
  /** Format: int32 */
  sequence?: number
  kind?: string | null
  /** Format: double */
  amount?: number
  currency?: string | null
  installmentStatus?: string | null
  /** Format: date-time */
  dueAt?: string | null
  overdue?: boolean
  /** Format: date-time */
  paidAt?: string | null
  paidLate?: boolean
  paymentState?: string | null
  current?: PaymentAttemptView
  attempts?: PaymentAttemptView[] | null
  /** Format: double */
  contractTotal?: number
  /** Format: double */
  installationTotal?: number | null
  /** Format: double */
  servicePackagesTotal?: number | null
  allocation?: InstallmentAllocation
}

export type SignatureSetView = {
  /** Format: uuid */
  signatureSetId?: string
  /** Format: uuid */
  contractId?: string
  /** Format: int32 */
  version?: number
  status?: string | null
  /** Format: int32 */
  expectedPageCount?: number
  /** Format: int32 */
  uploadedPageCount?: number
  missingPages?: number[] | null
  /** Format: date */
  signedOn?: string | null
  note?: string | null
  /** Format: uuid */
  createdByUserId?: string
  /** Format: date-time */
  createdAt?: string
  /** Format: uuid */
  finalizedByUserId?: string | null
  /** Format: date-time */
  finalizedAt?: string | null
  /** Format: int32 */
  revision?: number
  pages?: SignedPageView[] | null
}

export type SignedPageView = {
  /** Format: int32 */
  pageNumber?: number
  /** Format: uuid */
  fileId?: string
  sha256?: string | null
  contentType?: string | null
  /** Format: uuid */
  uploadedByUserId?: string
  /** Format: date-time */
  uploadedAt?: string
  /** Format: date-time */
  replacedAt?: string | null
}
