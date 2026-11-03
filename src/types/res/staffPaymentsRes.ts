// Viết tay vì swagger của tag StaffPayments chỉ khai "200 OK". Theo record C# của backend `main` (7c79fa8):
// Modules.Payments.PaymentService (ContractPaymentView, PaymentEventView); PaymentAttemptView dùng chung với khách
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'

/** Một dòng lịch sử thanh toán. `source`: WEBHOOK | RECONCILIATION | CUSTOMER | SYSTEM */
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
 * GET /api/contracts/{contractId}/payments (Sales, Manager, Admin). Chỉ đọc DB, không đối soát với PayOS (chỉ lệnh GET của
 * khách mới đối soát). `current`: link đã trả tiền, nếu không thì link còn trả được; `attempts` mới nhất trước
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
}
