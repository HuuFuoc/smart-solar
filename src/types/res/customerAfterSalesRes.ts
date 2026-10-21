// Viết tay vì swagger của tag CustomerAfterSales chỉ khai "200 OK". Theo record C# của backend `main` (6025bc1):
// Modules.AfterSales (PackageView, SubscriptionView, EntitlementView, PurchaseView, ServiceRequestView, WarrantyView)
// và Modules.Payments (PaymentAttemptView)
// Giờ trả về kèm +07:00, tiền là số nguyên VND

/** ServicePackageKinds. Truyền vào `kind` của GET .../packages để lọc */
export type ServicePackageKind = 'MAINTENANCE' | 'DISASTER_PROTECTION' | (string & {})

/** DisasterTypes */
export type DisasterType = 'STORM' | 'FLOOD' | 'LIGHTNING' | (string & {})

/** SubscriptionStatuses */
export type SubscriptionStatus =
  | 'AWAITING_PAYMENT'
  | 'CHECKOUT_EXPIRED'
  | 'PAID'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLATION_REQUESTED'
  | 'CANCELLED'
  | (string & {})

/** PaymentStatuses của một lần thanh toán PayOS */
export type PaymentAttemptStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'
  | 'REVIEW_REQUIRED'
  | 'REFUND_REQUIRED'
  | (string & {})

/** GET /api/customers/me/after-sales/packages: gói đang bán (backend chỉ trả gói isActive) */
export type PackageView = {
  packageId: string
  kind: ServicePackageKind
  name: string
  description: string | null
  price: number
  durationMonths: number
  /** Chỉ gói MAINTENANCE: các tháng có lượt bảo trì */
  visitMonths: number[]
  /** Chỉ gói DISASTER_PROTECTION */
  coveredDisasterTypes: DisasterType[]
  /** Phần trăm chi phí sửa chữa được hỗ trợ, 0 < x ≤ 100 */
  coveragePercent: number | null
  perIncidentLimit: number | null
  termLimit: number | null
  isActive: boolean
  revision: number
}

/** Một lượt bảo trì của gói MAINTENANCE */
export type EntitlementView = {
  entitlementId: string
  planMonth: number
  periodStartsAt: string
  periodEndsAt: string
  status: string
  currentRequestId: string | null
  extendedUntil: string | null
  consumedAt: string | null
}

/**
 * GET /api/customers/me/after-sales/subscriptions và kết quả của POST .../subscriptions/{id}/cancel.
 * Giá và quyền lợi là bản chụp lúc mua. `startsAt` / `endsAt` null cho tới khi đã thanh toán VÀ công trình đã bàn giao
 */
export type SubscriptionView = {
  subscriptionId: string
  contractId: string
  /** null khi hợp đồng chưa có dự án lắp đặt */
  projectId: string | null
  kind: ServicePackageKind
  status: SubscriptionStatus
  packageName: string
  price: number
  durationMonths: number
  visitMonths: number[]
  coveredDisasterTypes: DisasterType[]
  coveragePercent: number | null
  perIncidentLimit: number | null
  termLimit: number | null
  startsAt: string | null
  endsAt: string | null
  /** Gói thiên tai: bắt đầu bảo vệ (sau thời gian chờ của kỳ mới, hoặc ngay khi gia hạn liền kỳ) */
  coverageStartsAt: string | null
  /** Hỗ trợ đang giữ cho báo giá sửa chữa chưa xong */
  supportReserved: number
  supportConsumed: number
  /** Hạn mức kỳ còn lại; null khi gói không có hạn mức kỳ */
  supportAvailable: number | null
  /** Chỉ gói MAINTENANCE */
  remainingVisits: number | null
  /** Hạn thanh toán của đơn đang chờ */
  checkoutExpiresAt: string | null
  /** Lần thanh toán đang gắn với gói, xem bằng GET .../payments/{attemptId} */
  currentPaymentAttemptId: string | null
  paidAt: string | null
  cancellationRequestedAt: string | null
  entitlements: EntitlementView[]
}

/** PaymentAttemptView: một link thanh toán PayOS. GET /api/customers/me/after-sales/payments/{attemptId} */
export type PaymentAttemptView = {
  paymentAttemptId: string
  /** Có khi link gồm cả tiền hợp đồng */
  contractId: string | null
  orderCode: number
  /** Tổng mọi dòng của link (gói, và hợp đồng nếu thanh toán cùng) */
  amount: number
  currency: string
  status: PaymentAttemptStatus
  checkoutUrl: string | null
  /** Chuỗi VietQR của PayOS (không phải ảnh) */
  qrCode: string | null
  expiresAt: string
  paidAt: string | null
  providerReference: string | null
  failureReason: string | null
  createdAt: string
}

/** POST /api/customers/me/after-sales/purchases */
export type PurchaseView = {
  checkout: PaymentAttemptView
  subscriptionIds: string[]
}

// Yêu cầu bảo hành, sửa chữa, bảo trì. Khách, kinh doanh và quản lý dùng chung ServiceRequestView; chỉ nhân viên có `history`

/** ServiceRequestKinds: báo lỗi, lượt bảo trì của gói, bảo trì lẻ */
export type ServiceRequestKind = 'FAULT' | 'MAINTENANCE' | 'ONE_TIME_MAINTENANCE' | (string & {})

/** ServiceRequestStatuses */
export type ServiceRequestStatus =
  | 'SUBMITTED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'AWAITING_DECISION'
  | 'AWAITING_QUOTATION'
  | 'AWAITING_CUSTOMER'
  | 'READY_FOR_WORK'
  | 'PENDING_CUSTOMER_ACCEPTANCE'
  | 'DISPUTED'
  | 'REWORK_REQUIRED'
  | 'COMPLETED'
  | 'NOT_COMPLETED'
  | 'CANCELLED'
  | 'CLOSED_DUPLICATE'
  | (string & {})

/** Thiết bị đã lắp của công trình (AssetView của Modules.AfterSales) */
export type InstalledAssetView = {
  assetId: string
  assetType: string
  manufacturer: string
  model: string
  serialNumber: string
  positionCode: string | null
  status: string
  replacesAssetId: string | null
  serviceRequestId: string | null
  specifications: string | null
}

/** GET .../installations/{projectId}/warranty: bảo hành lắp đặt của một công trình */
export type WarrantyView = {
  projectId: string
  handoverAt: string | null
  warrantyMonths: number | null
  warrantyEndsAt: string | null
  underWarranty: boolean
  assets: InstalledAssetView[]
  subscriptions: SubscriptionView[]
  /** NOT_HANDED_OVER | NOT_RECORDED (hợp đồng cũ không ghi số tháng) | ACTIVE | EXPIRED */
  warrantyStatus: string
}

/** Hạng mục kỹ thuật viên chẩn đoán. `coverage`: PENDING | INSTALLATION_WARRANTY | REPAIR_WARRANTY | DISASTER_PROTECTION | CHARGEABLE */
export type ServiceItemView = {
  itemId: string
  assetId: string | null
  description: string
  diagnosis: string
  requiredParts: string | null
  coverage: string
  coverageReason: string | null
  /** OPEN | QUOTED | AUTHORIZED | DECLINED | DONE */
  status: string
  isSupplementary: boolean
  quotationId: string | null
  workResult: string | null
  partsUsed: string | null
}

/** Một buổi hẹn. `purpose`: INSPECTION | REPAIR | MAINTENANCE | REWORK */
export type ServiceVisitView = {
  visitId: string
  purpose: string
  /** SCHEDULED | IN_PROGRESS | REPORTED | CUSTOMER_ABSENT | DECLINED | CANCELLED */
  status: string
  technicianUserId: string | null
  technicianName: string | null
  startsAt: string
  endsAt: string
  /** PENDING: chờ kỹ thuật viên nhận; ACCEPTED: đã nhận */
  assignmentStatus: string | null
  /** Giờ hẹn khác giờ khách muốn thì khách phải xác nhận */
  customerConfirmationRequired: boolean
  customerConfirmedAt: string | null
  startedAt: string | null
  report: string | null
  reportedAt: string | null
  findingNote: string | null
  companyRescheduleReason: string | null
}

/** Một dòng báo giá (backend lưu dạng JSON) */
export type ServiceQuotationLine = {
  itemId: string | null
  description: string
  partsAmount: number
  laborAmount: number
}

export type ServiceQuotationView = {
  quotationId: string
  version: number
  isSupplementary: boolean
  /** ISSUED | ACCEPTED | PAID | REJECTED | SUPERSEDED | EXPIRED | CANCELLED */
  status: string
  lines: ServiceQuotationLine[]
  partsAmount: number
  laborAmount: number
  totalAmount: number
  disasterSupportAmount: number
  /** Số tiền khách trả sau khi trừ hỗ trợ thiên tai */
  customerAmount: number
  repairWarrantyMonths: number | null
  note: string | null
  issuedAt: string
  expiresAt: string
  acceptedAt: string | null
  paidAt: string | null
  /** Link PayOS đang gắn, xem bằng GET .../payments/{attemptId} */
  currentPaymentAttemptId: string | null
}

export type ServiceEvidenceView = {
  evidenceId: string
  visitId: string | null
  fileId: string
  caption: string | null
  addedAt: string
}

/** GET .../evidence/{evidenceId}/url: link xem ảnh ký sẵn */
export type ServiceEvidenceUrlView = {
  url: string
  expiresAt: string
}

export type AfterSalesEventView = {
  eventType: string
  actorUserId: string | null
  detail: string | null
  createdAt: string
}

/** Yêu cầu khác đang mở của cùng công trình (chỉ để cảnh báo trùng) */
export type PossibleDuplicateView = {
  requestId: string
  requestNumber: string
  kind: ServiceRequestKind
  status: ServiceRequestStatus
  description: string
  createdAt: string
}

/** Chi tiết một yêu cầu cho khách, kinh doanh, quản lý; mọi thao tác ghi trên yêu cầu cũng trả về view này */
export type ServiceRequestView = {
  requestId: string
  requestNumber: string
  kind: ServiceRequestKind
  status: ServiceRequestStatus
  projectId: string
  description: string
  suspectedAssetId: string | null
  /** Giờ khách muốn (bảo trì) */
  preferredStartsAt: string | null
  installationWarrantyEndsAt: string | null
  /** Bảo hành lắp đặt còn hạn lúc báo lỗi */
  withinInstallationWarranty: boolean
  withinRepairWarranty: boolean
  warrantySourceRequestId: string | null
  originRequestId: string | null
  duplicateOfRequestId: string | null
  maintenanceEntitlementId: string | null
  /** NO_FAULT_FOUND | REPAIRED | MAINTENANCE_DONE | CUSTOMER_ABSENT */
  outcome: string | null
  customerDecisionReason: string | null
  acceptanceRequestedAt: string | null
  completedAt: string | null
  repairWarrantyMonths: number | null
  repairWarrantyStartsAt: string | null
  repairWarrantyEndsAt: string | null
  cancellationRequestedAt: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  createdAt: string
  /** Quản lý gửi lại khi xếp lịch (expectedRevision) */
  revision: number
  items: ServiceItemView[]
  visits: ServiceVisitView[]
  quotations: ServiceQuotationView[]
  /** Yêu cầu hỗ trợ thiên tai, web chưa dùng */
  claim: unknown
  evidence: ServiceEvidenceView[]
  possibleDuplicates: PossibleDuplicateView[]
  /** null với khách */
  history: AfterSalesEventView[] | null
}

/** Một dòng của GET .../requests (khách và quản lý) */
export type ServiceRequestSummary = {
  requestId: string
  requestNumber: string
  kind: ServiceRequestKind
  status: ServiceRequestStatus
  projectId: string
  description: string
  preferredStartsAt: string | null
  createdAt: string
}
