// Viết tay vì swagger của tag CustomerAfterSales chỉ khai "200 OK". Theo record C# của backend `main` (6025bc1):
// Modules.AfterSales (PackageView, SubscriptionView, EntitlementView, PurchaseView) và Modules.Payments (PaymentAttemptView)
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
