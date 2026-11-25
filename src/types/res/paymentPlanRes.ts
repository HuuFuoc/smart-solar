// Viết tay vì swagger chỉ khai "200 OK". Theo record C# của backend `main` 7d27054 (gói thanh toán 30/70, hợp đồng ký giấy):
// Modules.CustomerContracts (PaymentPlanViews, InstallmentPaymentHandlers, PaperSignatureHandlers, ContractDirectoryHandlers,
// CollectionHandlers, FinanceOverview). Tiền là số VND nguyên; giờ là ISO-8601 (UTC)

import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'

export type PaymentPlanCode = 'DEPOSIT_30_BALANCE_70' | (string & {})

/** DRAFT_CREATED → DEPOSIT_VERIFIED → READY_FOR_INSTALLATION → BALANCE_DUE | BALANCE_OVERDUE → FULLY_PAID; DISCARDED */
export type PaymentPlanStage =
  | 'DRAFT_CREATED'
  | 'DEPOSIT_VERIFIED'
  | 'READY_FOR_INSTALLATION'
  | 'BALANCE_DUE'
  | 'BALANCE_OVERDUE'
  | 'FULLY_PAID'
  | 'DISCARDED'
  | (string & {})

export type InstallmentKind = 'DEPOSIT' | 'BALANCE' | (string & {})

/** PENDING: chưa tới lúc trả (khoản 70% trước khi khách nghiệm thu); DUE: trả được; PAID; CANCELLED */
export type InstallmentStatus = 'PENDING' | 'DUE' | 'PAID' | 'CANCELLED' | (string & {})

export type OwnershipStatus = 'OWNERSHIP_RETAINED' | 'OWNERSHIP_TRANSFER_ELIGIBLE' | 'NOT_APPLICABLE' | (string & {})

/**
 * InstallmentAllocation (backend 763cb0b): một khoản chia cho chi phí lắp đặt và từng loại gói đi kèm, chốt lúc lập hợp đồng. Chỉ
 * để đọc: số phải trả luôn là `amount` của khoản; installation + maintenancePackages + disasterPackages = amount
 */
export type InstallmentAllocation = {
  sequence: number
  amount: number
  installation: number
  maintenancePackages: number
  disasterPackages: number
}

/**
 * ContractServicePackageStatuses. COMMITTED: thuộc hợp đồng, chưa cấp quyền lợi; PROVISIONED: đã tạo kỳ gói (`subscriptionId`, kỳ
 * có trạng thái riêng); RECONCILIATION_REQUIRED: số tấm pin đã lắp khác hợp đồng, chưa cấp gì; DISCARDED: hợp đồng huỷ trước 30%
 */
export type BundledPackageStatus = 'COMMITTED' | 'PROVISIONED' | 'RECONCILIATION_REQUIRED' | 'DISCARDED' | (string & {})

/**
 * Gói đi kèm hợp đồng (ContractServicePackageView): bản chụp bất biến, phần của từng khoản và trạng thái. Giá là giá trong hợp
 * đồng, không phải giá danh mục hiện tại
 */
export type ContractServicePackageView = {
  commitmentId: string
  kind: string
  packageId: string
  packageName: string
  description: string | null
  imageUrl: string | null
  pricingUnit: string
  unitPrice: number
  quantity: number
  totalAmount: number
  durationMonths: number
  visitMonths: number[]
  coveredDisasterTypes: string[]
  coveragePercent: number | null
  perIncidentLimit: number | null
  termLimit: number | null
  catalogRevision: number
  snapshotAt: string
  /** Phần của gói trong khoản 30% */
  depositAllocation: number
  /** Phần của gói trong khoản 70% */
  balanceAllocation: number
  status: BundledPackageStatus
  /** Câu tiếng Anh của backend: vì sao chờ đối soát, hoặc vì sao huỷ */
  statusReason: string | null
  subscriptionId: string | null
  statusChangedAt: string | null
}

/** InstallmentView */
export type InstallmentView = {
  installmentId: string
  /** 1 = 30%, 2 = 70% */
  sequence: number
  kind: InstallmentKind
  percent: number
  amount: number
  status: InstallmentStatus
  openedAt: string | null
  /** Hạn của khoản 70% (lúc khách nghiệm thu + 72 giờ); null với khoản 30% và khoản chưa mở */
  dueAt: string | null
  /** DUE và đã qua `dueAt` (backend tính, đúng `dueAt` chưa quá hạn) */
  overdue: boolean
  paidAt: string | null
  paidAmount: number | null
  paidLate: boolean
  settledPaymentAttemptId: string | null
  /** Hợp đồng có gói đi kèm: khoản này chia cho lắp đặt và gói thế nào (backend 763cb0b). null với hợp đồng không có gói */
  allocation: InstallmentAllocation | null
}

/** SignedPageView */
export type SignedPageView = {
  pageNumber: number
  fileId: string
  sha256: string
  contentType: string
  uploadedByUserId: string
  uploadedAt: string
  /** Có giá trị khi trang đã bị thay bằng tệp khác (lịch sử) */
  replacedAt: string | null
}

export type SignatureSetStatus = 'UPLOADING' | 'FINALIZED' | 'SUPERSEDED' | (string & {})

/** SignatureSetView: một lần tải các trang hợp đồng giấy đã ký */
export type SignatureSetView = {
  signatureSetId: string
  contractId: string
  version: number
  status: SignatureSetStatus
  expectedPageCount: number
  uploadedPageCount: number
  /** Trang 1..N chưa có tệp; rỗng khi đủ */
  missingPages: number[]
  /** YYYY-MM-DD */
  signedOn: string | null
  note: string | null
  createdByUserId: string
  createdAt: string
  finalizedByUserId: string | null
  finalizedAt: string | null
  revision: number
  pages: SignedPageView[]
}

/** CollectionCaseSummaryView: chỉ nhân viên thấy */
export type CollectionCaseSummaryView = {
  caseId: string
  installmentId: string
  status: CollectionCaseStatus
  openedAt: string
  dueAt: string
  amountDue: number
  promisedPaymentDate: string | null
  resolvedAt: string | null
  resolution: string | null
}

/** ContractView.paymentPlan; null là hợp đồng cũ (trả 100%) */
export type ContractPaymentPlanView = {
  plan: PaymentPlanCode
  termsVersion: string | null
  stage: PaymentPlanStage
  total: number
  /** Tổng các khoản đã PAID */
  paid: number
  /** total − paid, gồm cả khoản 70% chưa tới hạn */
  outstanding: number
  depositPaid: boolean
  paperSigned: boolean
  readyForInstallation: boolean
  fullyPaid: boolean
  overdue: boolean
  nextDueAt: string | null
  ownershipStatus: OwnershipStatus
  /** Điều khoản thanh toán / sở hữu còn chờ bộ phận pháp lý duyệt */
  termsPendingLegalReview: boolean
  /** Có hồ sơ thu hồi công nợ đã chuyển xem xét pháp lý */
  legalReviewRequired: boolean
  installments: InstallmentView[]
  signature: SignatureSetView | null
  collection: CollectionCaseSummaryView[] | null
}

export type InstallmentPaymentState =
  'NOT_PAYABLE' | 'AWAITING_PAYMENT' | 'ONLINE_IN_PROGRESS' | 'AWAITING_CASH_CONFIRMATION' | 'PAID' | (string & {})

/** InstallmentPaymentView: GET / POST .../installments/{sequence}/payment */
export type InstallmentPaymentView = {
  contractId: string
  contractNumber: string
  installmentId: string
  sequence: number
  kind: InstallmentKind
  amount: number
  currency: string
  installmentStatus: InstallmentStatus
  dueAt: string | null
  overdue: boolean
  paidAt: string | null
  paidLate: boolean
  paymentState: InstallmentPaymentState
  /** Lần đã trả, không thì lần đang mở */
  current: PaymentAttemptView | null
  attempts: PaymentAttemptView[]
  // Backend 763cb0b. Số phải trả (và số của mã QR) luôn là `amount`; các trường dưới chỉ để đọc
  /** Tổng giá trị hợp đồng (lắp đặt + gói đi kèm) */
  contractTotal: number
  /** null với hợp đồng không có gói */
  installationTotal: number | null
  servicePackagesTotal: number | null
  allocation: InstallmentAllocation | null
}

/** AttachedFileUrlView: link ký sẵn sống vài phút, không lưu */
export type AttachedFileUrlView = {
  id: string
  url: string
  expiresAt: string
  disposition: string
  contentType: string
  fileName: string
}

/** ContractDirectoryItem: GET /api/contracts (nhân viên đọc mọi hợp đồng) */
export type ContractDirectoryItem = {
  contractId: string
  contractNumber: string
  version: number
  status: string
  /** null là hợp đồng cũ */
  paymentPlan: PaymentPlanCode | null
  stage: string
  customerUserId: string
  customerName: string
  customerPhone: string | null
  surveyRequestId: string
  propertySiteId: string | null
  propertyName: string | null
  quotationId: string
  projectId: string | null
  projectStatus: string | null
  totalAmount: number
  paid: number
  outstanding: number
  depositPaid: boolean
  fullyPaid: boolean
  overdue: boolean
  nextDueAt: string | null
  ownershipStatus: OwnershipStatus
  createdAt: string
}

export type PagedResult<T> = {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export type CollectionCaseStatus =
  | 'SALES_CONTACT_REQUIRED'
  | 'CONTACTED'
  | 'NEGOTIATION_IN_PROGRESS'
  | 'AGREEMENT_RECORDED'
  | 'ESCALATED_TO_MANAGER'
  | 'LEGAL_REVIEW_REQUIRED'
  | 'RESOLVED'
  | (string & {})

/** CollectionActivityView */
export type CollectionActivityView = {
  activityId: string
  /** OPENED | CONTACT | NEGOTIATION | AGREEMENT | NOTE | ESCALATE | LEGAL_REVIEW | RESOLVE | PAID */
  kind: string
  fromStatus: string | null
  toStatus: string | null
  actorUserId: string | null
  actorRole: string | null
  channel: string | null
  summary: string | null
  promisedPaymentDate: string | null
  evidenceFileIds: string[]
  occurredAt: string
}

/** CollectionCaseView: hồ sơ thu hồi một khoản quá hạn */
export type CollectionCaseView = {
  caseId: string
  contractId: string
  contractNumber: string
  installmentId: string
  installmentSequence: number
  customerUserId: string
  customerName: string
  customerPhone: string | null
  status: CollectionCaseStatus
  openedAt: string
  dueAt: string
  /** Số ngày tròn từ lúc quá hạn (0 trong ngày đầu) */
  daysOverdue: number
  amountDue: number
  installmentStatus: InstallmentStatus
  /** Ngày khách hẹn trả; không đổi hạn trong hợp đồng */
  promisedPaymentDate: string | null
  resolvedAt: string | null
  resolvedByUserId: string | null
  resolution: string | null
  revision: number
  /** Chỉ có ở GET /collections/{id} */
  activities: CollectionActivityView[] | null
}

/** MoneyBucket: số lượng và số tiền VND */
export type MoneyBucket = { key: string; count: number; amount: number }

/** FinanceOverviewView: GET /api/admin/finance/overview (chỉ quản trị) */
export type FinanceOverviewView = {
  from: string
  to: string
  zoneId: string | null
  generatedAt: string
  paymentPlanContracts: MoneyBucket
  legacyContracts: MoneyBucket
  depositsPaid: MoneyBucket
  depositsDue: MoneyBucket
  balancesPending: MoneyBucket
  balancesDue: MoneyBucket
  balancesOverdue: MoneyBucket
  balancesPaid: MoneyBucket
  balancesPaidLate: number
  outstanding: MoneyBucket
  outstandingDueNow: MoneyBucket
  awaitingAcceptance: MoneyBucket
  acceptedUnpaid: MoneyBucket
  fullyPaid: MoneyBucket
  contractsByStage: MoneyBucket[]
  openCollectionCasesByStatus: MoneyBucket[]
  negotiations: MoneyBucket
  escalations: MoneyBucket
  depositsCollected: MoneyBucket
  balancesCollected: MoneyBucket
  installmentsCollectedByMethod: MoneyBucket[]
  legacyContractPaymentsCollected: MoneyBucket
  unapplied: MoneyBucket
  refunded: MoneyBucket
  /**
   * Backend 763cb0b, trong kỳ: tiền đã thu theo thành phần (`key`: INSTALLATION, BUNDLED_MAINTENANCE_PACKAGES,
   * BUNDLED_DISASTER_PROTECTION_PACKAGES, RETAIL_MAINTENANCE_PACKAGES, RETAIL_DISASTER_PROTECTION_PACKAGES). Ba nhóm đầu cộng lại
   * bằng khoản 30% + 70% đã thu; mỗi đồng chỉ tính một lần. Thiếu khi máy chủ chưa nâng cấp
   */
  collectedByComponent: MoneyBucket[] | null
}
