// Body gửi phiếu thu (backend 9ae01e7: CashReceiptRequest)

/** POST .../payment/cash-receipt của kỹ thuật viên */
export type CashReceiptRequest = {
  /** `current.paymentAttemptId` của lần thanh toán tiền mặt đang mở */
  paymentAttemptId: string
  /** 1 đến 100 ký tự, không trùng phiếu của lần thanh toán khác */
  receiptNumber: string
  /** Tệp PAYMENT_EVIDENCE đã VERIFIED do chính kỹ thuật viên tải lên */
  evidenceFileId: string
  /** Có múi giờ; bỏ trống là lúc gửi */
  collectedAt: string | null
  note: string | null
}
