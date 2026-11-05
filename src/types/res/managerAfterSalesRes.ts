// Viết tay vì swagger của tag ManagerAfterSales chỉ khai "200 OK". Theo RefundView ở AfterSalesViews.cs của backend `main` (7c79fa8)

import type { SubscriptionView } from '@/types/res/customerAfterSalesRes'

/**
 * Khoản hoàn tiền làm tay (GET /api/manager/after-sales/refunds, quản lý và quản trị). Quản lý duyệt, quản trị ghi nhận sau
 * khi đã chuyển tiền ngoài hệ thống. `status`: PENDING_APPROVAL | APPROVED | REJECTED | REFUNDED
 */
export type RefundView = {
  refundId: string
  customerUserId: string
  paymentAttemptId: string | null
  subscriptionId: string | null
  quotationId: string | null
  requestId: string | null
  /** VND nguyên */
  originalAmount: number
  /** Có khi quản lý đã duyệt */
  approvedAmount: number | null
  reason: string
  status: string
  approvedByUserId: string | null
  approvedAt: string | null
  decisionNote: string | null
  recordedByUserId: string | null
  /** Ngày tiền thực sự được trả, quyết định khoản này nằm ở kỳ báo cáo nào */
  refundedAt: string | null
  refundReference: string | null
  createdAt: string
  revision: number
}

/**
 * Gói khách đã mua nhìn từ quản lý / quản trị (GET /api/manager/after-sales/subscriptions?status=, GET .../subscriptions/{id}).
 * Viết tay theo ManagerSubscriptionView của API bổ sung trên nhánh kiểm thử (ServicePackageHandlers.ListForManagerAsync)
 */
export type ManagerSubscriptionView = {
  subscription: SubscriptionView
  customerUserId: string
  /** Họ tên khách; trống khi tài khoản chưa có họ tên */
  customerName: string
  /** Lý do khách xin huỷ */
  cancellationReason: string | null
  cancelledAt: string | null
}

/** Tài khoản kinh doanh đang hoạt động để giao việc (GET /api/manager/after-sales/sales-assignees, quản lý và quản trị) */
export type SalesAssigneeView = {
  userId: string
  fullName: string
}
