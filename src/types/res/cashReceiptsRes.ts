// Viết tay theo record C# của backend `main` 9ae01e7 (PR #24, Modules.Payments.CashReceiptEntities): phiếu thu tiền mặt kỹ thuật viên
// chụp sau khi nhận tiền của khách, dùng chung cho khoản 30/70 của hợp đồng và báo giá hậu mãi. Gửi phiếu không trả gì: lần thanh
// toán vẫn PENDING tới khi quản lý / quản trị duyệt

/** SUBMITTED: chờ duyệt; ACCEPTED: đã duyệt, lần thanh toán thành PAID; REJECTED: yêu cầu bổ sung; WITHDRAWN: chỉ còn trong lịch sử */
export type CashReceiptStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | (string & {})

/** INSTALLMENT: khoản 30/70 của hợp đồng; SERVICE_QUOTATION: báo giá hậu mãi */
export type CashReceiptKind = 'INSTALLMENT' | 'SERVICE_QUOTATION' | (string & {})

export type CashReceiptView = {
  cashReceiptId: string
  paymentAttemptId: string
  kind: CashReceiptKind
  /** Chỉ có với khoản 30/70 */
  contractId: string | null
  contractInstallmentId: string | null
  /** Chỉ có với báo giá hậu mãi */
  serviceQuotationId: string | null
  serviceRequestId: string | null
  /** Số tiền của lần thanh toán lúc gửi phiếu */
  amount: number
  receiptNumber: string
  collectedByUserId: string
  /** Lúc kỹ thuật viên nhận tiền; backend dùng mốc này để xét hạn báo giá */
  collectedAt: string
  evidenceFileId: string
  note: string | null
  status: CashReceiptStatus
  submittedAt: string
  reviewedByUserId: string | null
  reviewedAt: string | null
  /** Lý do yêu cầu bổ sung (REJECTED) hoặc ghi chú khi duyệt (ACCEPTED) */
  reviewReason: string | null
  /** Gửi kèm khi duyệt; lệch thì backend trả 409 PAYMENT_CASH_RECEIPT_STALE */
  revision: number
}
