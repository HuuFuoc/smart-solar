import type {
  CashReceiptAcceptRequest,
  CashReceiptQuery,
  CashReceiptRejectRequest,
  CashReceiptSubmitRequest,
} from '@/types/req/paymentPlanReq'
import type { PaymentAttemptView } from '@/types/res/customerAfterSalesRes'
import type {
  AttachedFileUrlView,
  CashReceiptView,
  InstallmentPaymentView,
  PagedResult,
  StaffCashReceiptDetail,
  StaffCashReceiptView,
} from '@/types/res/paymentPlanRes'
import { get, post } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { InstallmentTarget } from '@/services/installmentService'

// Phiếu thu tiền mặt của kỹ thuật viên cho khoản 30/70 (backend 147c66e). Kỹ thuật viên đã khảo sát gửi số phiếu và ảnh phiếu
// thu; gửi xong khoản vẫn chưa trả. Chỉ quản lý / quản trị xác nhận (lần thanh toán thành PAID, dùng lại ảnh của kỹ thuật viên)
// hoặc yêu cầu bổ sung. Link ảnh là link ký sẵn sống vài phút, backend gửi kèm no-store: chỉ xin khi xem, không lưu, không ghi log

const installments = ENDPOINTS.installments
const desk = ENDPOINTS.managerPayments

export type EvidenceDisposition = 'inline' | 'attachment'

/** Gửi phiếu thu; trả khoản với `currentCashReceipt.status = SUBMITTED` (vẫn AWAITING_CASH_CONFIRMATION, DUE) */
export function submitCashReceipt({ contractId, sequence }: InstallmentTarget, body: CashReceiptSubmitRequest) {
  return post<InstallmentPaymentView>(installments.technicianCashReceipt(contractId, sequence), body)
}

/** Ảnh một phiếu thu đã gửi của khoản, kỹ thuật viên đã khảo sát xem */
export function getTechnicianReceiptEvidenceUrl(
  { contractId, sequence }: InstallmentTarget,
  receiptId: string,
  disposition: EvidenceDisposition,
) {
  return get<AttachedFileUrlView>(installments.technicianCashReceiptEvidenceUrl(contractId, sequence, receiptId), {
    params: { disposition },
  })
}

/** Hàng chờ của quản lý / quản trị, mới nhất trước */
export function listCashReceipts({ status, kind, page, pageSize }: CashReceiptQuery) {
  return get<PagedResult<StaffCashReceiptView>>(desk.cashReceipts, {
    params: { status: status || undefined, kind: kind || undefined, page, pageSize },
  })
}

export function getCashReceipt(receiptId: string) {
  return get<StaffCashReceiptDetail>(desk.cashReceipt(receiptId))
}

export function getCashReceiptEvidenceUrl(receiptId: string, disposition: EvidenceDisposition) {
  return get<AttachedFileUrlView>(desk.cashReceiptEvidenceUrl(receiptId), { params: { disposition } })
}

/** Xác nhận đúng `revision` đã xem: lần thanh toán thành PAID, khoản được ghi đã trả */
export function acceptCashReceipt(receiptId: string, body: CashReceiptAcceptRequest) {
  return post<PaymentAttemptView>(desk.acceptCashReceipt(receiptId), body)
}

/** Yêu cầu bổ sung (lý do bắt buộc, kỹ thuật viên thấy); lần thanh toán vẫn chờ tiền mặt */
export function rejectCashReceipt(receiptId: string, body: CashReceiptRejectRequest) {
  return post<CashReceiptView>(desk.rejectCashReceipt(receiptId), body)
}
