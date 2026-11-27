import type { PaymentLineView } from '@/types/res/staffPaymentsRes'

// Viết tay theo record C# của backend `main` 9ae01e7 (PR #24, Modules.Payments.CashReceiptEntities): phiếu thu tiền mặt kỹ thuật viên
// chụp sau khi nhận tiền của khách, dùng chung cho khoản 30/70 của hợp đồng và báo giá hậu mãi. Gửi phiếu không trả gì: lần thanh
// toán vẫn PENDING tới khi quản lý / quản trị duyệt

/** SUBMITTED: chờ duyệt; ACCEPTED: đã duyệt, lần thanh toán thành PAID; REJECTED: yêu cầu bổ sung; WITHDRAWN: chỉ còn trong lịch sử */
export type CashReceiptStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | (string & {})

/** INSTALLMENT: khoản 30/70 của hợp đồng; SERVICE_QUOTATION: báo giá hậu mãi */
export type CashReceiptKind = 'INSTALLMENT' | 'SERVICE_QUOTATION' | (string & {})

/** Ngữ cảnh của dòng trong hàng đợi duyệt */
export type CashReceiptContext =
  'INSTALLATION_DEPOSIT' | 'INSTALLATION_BALANCE' | 'AFTER_SALES_QUOTATION' | (string & {})

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

/** GET /api/manager/payments/cash-receipts (Manager, Admin, luôn phân trang, mới nhất trước) */
export type StaffCashReceiptView = {
  receipt: CashReceiptView
  context: CashReceiptContext
  /** Chuỗi rỗng với báo giá hậu mãi */
  contractNumber: string
  installmentSequence: number | null
  /** DEPOSIT | BALANCE */
  installmentKind: string | null
  serviceRequestId: string | null
  serviceRequestNumber: string | null
  /** FAULT | ONE_TIME_MAINTENANCE | MAINTENANCE */
  serviceRequestKind: string | null
  serviceQuotationId: string | null
  quotationVersion: number | null
  customerUserId: string
  customerName: string
  /** Kỹ thuật viên đã nhận tiền */
  collectedByName: string
  /** Trạng thái lần thanh toán */
  paymentStatus: string
}

/**
 * GET /api/manager/payments/cash-receipts/{id}: `history` là mọi phiếu của cùng lần thanh toán (cũ trước), `lines` là các dòng
 * của lần thanh toán. Sau khi duyệt, dòng REVIEW_REQUIRED là tiền đã ghi nhận mà không áp được (xem sổ tiền chưa áp)
 */
export type StaffCashReceiptDetail = {
  current: StaffCashReceiptView
  history: CashReceiptView[]
  lines: PaymentLineView[] | null
}
