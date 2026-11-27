// Body gửi phiếu thu và duyệt phiếu thu (backend 9ae01e7: CashReceiptRequest, CashReceiptReviewRequest)

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

/** POST /api/manager/payments/cash-receipts/{id}/accept | reject */
export type CashReceiptReviewRequest = {
  revision: number
  /** Bắt buộc khi yêu cầu bổ sung, tối đa 500 ký tự */
  reason?: string
  note?: string | null
}
