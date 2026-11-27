import type { CashReceiptReviewRequest } from '@/types/req/cashReceiptsReq'
import type { CashConfirmationRequest } from '@/types/req/staffPaymentsReq'
import type { PagedResult } from '@/types/res/adminSystemSettingsRes'
import type { CashReceiptView, StaffCashReceiptDetail, StaffCashReceiptView } from '@/types/res/cashReceiptsRes'
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'
import type { AttachedFileUrlView } from '@/types/res/paymentPlanRes'
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

export type CashReceiptFilter = {
  /** SUBMITTED | ACCEPTED | REJECTED; null là mọi trạng thái */
  status: string | null
  /** INSTALLMENT | SERVICE_QUOTATION; null là cả hai */
  kind: string | null
  page: number
  /** Tối đa 100 */
  pageSize: number
}

/** Phiếu thu kỹ thuật viên gửi, mới nhất trước */
export function listCashReceipts(f: CashReceiptFilter) {
  return get<PagedResult<StaffCashReceiptView>>(ENDPOINTS.managerPayments.cashReceipts, {
    params: { status: f.status ?? undefined, kind: f.kind ?? undefined, page: f.page, pageSize: f.pageSize },
  })
}

export function getCashReceipt(receiptId: string) {
  return get<StaffCashReceiptDetail>(ENDPOINTS.managerPayments.cashReceipt(receiptId))
}

/** Ảnh phiếu kỹ thuật viên đã tải, link sống vài phút: xin lúc xem, không lưu */
export function getCashReceiptEvidenceUrl(receiptId: string, disposition: 'inline' | 'attachment') {
  return get<AttachedFileUrlView>(ENDPOINTS.managerPayments.cashReceiptEvidenceUrl(receiptId), {
    params: { disposition },
  })
}

/** Duyệt đúng bản đã xem (`revision`): lần thanh toán thành PAID. Kết quả áp tiền đọc lại ở chi tiết, không suy từ HTTP 200 */
export function acceptCashReceipt(receiptId: string, body: CashReceiptReviewRequest) {
  return post<PaymentAttemptView>(ENDPOINTS.managerPayments.acceptCashReceipt(receiptId), body)
}

/** Yêu cầu kỹ thuật viên gửi lại phiếu; lý do bắt buộc, kỹ thuật viên thấy lý do này */
export function rejectCashReceipt(receiptId: string, body: CashReceiptReviewRequest) {
  return post<CashReceiptView>(ENDPOINTS.managerPayments.rejectCashReceipt(receiptId), body)
}
