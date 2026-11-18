// Viết tay vì swagger của tag StaffPayments chỉ khai "200 OK". Theo record C# của backend `main` (ad10455):
// Modules.Payments.PaymentService (ContractPaymentView, PaymentEventView); PaymentAttemptView dùng chung với khách
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'

/** Một dòng lịch sử thanh toán. `source`: WEBHOOK | RECONCILIATION | CUSTOMER | SYSTEM | STAFF */
export type PaymentEventView = {
  paymentAttemptId: string
  eventType: string
  fromStatus: string | null
  toStatus: string | null
  source: string
  detail: string | null
  createdAt: string
}

/**
 * Trạng thái thanh toán suy ra của hợp đồng (ContractPaymentStates). Hợp đồng vẫn SIGNED khi khách đã chọn tiền mặt: chọn
 * tiền mặt chưa phải đã trả
 */
export type ContractPaymentState =
  'NOT_PAYABLE' | 'AWAITING_PAYMENT' | 'ONLINE_IN_PROGRESS' | 'AWAITING_CASH_CONFIRMATION' | 'PAID' | (string & {})

/**
 * GET /api/contracts/{contractId}/payments (Manager, Admin) và GET /api/customers/me/contracts/{id}/payments (khách). Phía nhân
 * viên chỉ đọc DB, không đối soát với PayOS. `current`: lần đã trả tiền, nếu không thì lần còn trả được; `attempts` mới nhất trước
 */
export type ContractPaymentView = {
  contractId: string
  contractStatus: string
  amount: number
  currency: string
  current: PaymentAttemptView | null
  attempts: PaymentAttemptView[]
  /** Luôn có với nhân viên */
  history: PaymentEventView[] | null
  paymentState: ContractPaymentState
}

/**
 * Một dòng của lần thanh toán (backend 462733c, PaymentLineView). `itemType`: CONTRACT | MAINTENANCE_PACKAGE | DISASTER_PACKAGE |
 * REPAIR_QUOTATION | MAINTENANCE_QUOTATION | INSTALLATION_QUOTATION (báo giá lắp đặt trả trước, `installationQuotationId`)
 */
export type PaymentLineView = {
  itemType: string
  amount: number
  status: string
  contractId: string | null
  subscriptionId: string | null
  quotationId: string | null
  /** Báo giá lắp đặt khách đồng ý tại công trình; áp xong thì hợp đồng tự lập (`contractId` của lần thanh toán) */
  installationQuotationId?: string | null
}

/** GET /api/manager/payments (Manager, Admin, luôn phân trang): lần thanh toán kèm các dòng, mới nhất trước */
export type StaffPaymentAttemptView = {
  attempt: PaymentAttemptView
  customerUserId: string
  lines: PaymentLineView[]
}
