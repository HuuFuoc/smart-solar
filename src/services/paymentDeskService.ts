import type { CashConfirmationRequest } from '@/types/req/staffPaymentsReq'
import type { PagedResult } from '@/types/res/adminSystemSettingsRes'
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'
import type { UnappliedMoneyView } from '@/types/res/managerAfterSalesRes'
import type { StaffPaymentAttemptView } from '@/types/res/staffPaymentsRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

// Bàn thu tiền của quản lý / quản trị và sổ tiền chưa áp. Cả hai luôn phân trang ở backend. Tiền mặt chỉ thành đã trả khi xác
// nhận ở đây (hoặc trên trang hợp đồng); FE không tự đổi trạng thái

export type PaymentDeskFilter = {
  method: string | null
  status: string | null
  /** ISO, lọc theo lúc tạo */
  from: string | null
  to: string | null
  page: number
  pageSize: number
}

export function listPayments(f: PaymentDeskFilter) {
  return get<PagedResult<StaffPaymentAttemptView>>(ENDPOINTS.managerPayments.base, {
    params: {
      method: f.method ?? undefined,
      status: f.status ?? undefined,
      from: f.from ?? undefined,
      to: f.to ?? undefined,
      page: f.page,
      pageSize: f.pageSize,
    },
  })
}

/** Số tiền phải đúng bằng `amount` của lần thanh toán; phiếu thu PAYMENT_EVIDENCE do chính người xác nhận tải lên */
export function confirmCash(attemptId: string, body: CashConfirmationRequest) {
  return post<PaymentAttemptView>(ENDPOINTS.managerPayments.cashConfirm(attemptId), body)
}

export function listUnappliedMoney(status: string | null, page: number, pageSize: number) {
  return get<PagedResult<UnappliedMoneyView>>(ENDPOINTS.managerAfterSales.unappliedMoney, {
    params: { status: status ?? undefined, page, pageSize },
  })
}
