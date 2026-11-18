// Viết tay vì swagger của tag ManagerAfterSales chỉ khai "200 OK"

/** Tài khoản kinh doanh đang hoạt động để giao việc (GET /api/manager/after-sales/sales-assignees, quản lý và quản trị) */
export type SalesAssigneeView = {
  userId: string
  fullName: string
}

/**
 * GET /api/manager/after-sales/unapplied-money (backend 8f70cb2, UnappliedMoneyView): tiền đã nhận nhưng không áp vào khoản nào
 * (trả trùng, sai số tiền, trả sau hạn). Chỉ đọc: ứng dụng không duyệt hay hoàn tiền. `status`: PENDING_APPROVAL | APPROVED |
 * REJECTED | REFUNDED; `reason` là câu gốc của backend
 */
export type UnappliedMoneyView = {
  recordId: string
  status: string
  amount: number
  reason: string
  customerUserId: string
  paymentAttemptId: string | null
  subscriptionId: string | null
  quotationId: string | null
  requestId: string | null
  createdAt: string
  approvedAmount: number | null
  refundedAt: string | null
}
