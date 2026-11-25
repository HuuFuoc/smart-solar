// Viết tay vì swagger của tag ManagerAfterSales chỉ khai "200 OK"

import type { BundledPackageStatus } from '@/types/res/paymentPlanRes'

/**
 * GET /api/manager/after-sales/bundled-packages (backend 763cb0b, BundledPackageView; quản lý và quản trị): gói đi kèm hợp đồng
 * lắp đặt và kỳ gói nó đã thành. `statusReason` là câu tiếng Anh của backend
 */
export type BundledPackageView = {
  commitmentId: string
  contractId: string
  kind: string
  packageName: string
  unitPrice: number
  quantity: number
  totalAmount: number
  depositAllocation: number
  balanceAllocation: number
  status: BundledPackageStatus
  statusReason: string | null
  statusChangedAt: string | null
  subscriptionId: string | null
  /** Trạng thái của kỳ gói đã tạo (SubscriptionStatuses); null khi chưa tạo */
  subscriptionStatus: string | null
  startsAt: string | null
  endsAt: string | null
  coverageStartsAt: string | null
  revision: number
}

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
