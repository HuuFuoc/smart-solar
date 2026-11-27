// Viết tay: các path của gói thanh toán 30/70 chưa có trong docs/api/swagger.json. Theo record C# của backend `main` 7d27054
// (SmartSolar.Api.Contracts.InstallationWorkflow.InstallationRequests)

/** InstallmentPaymentRequest */
export type InstallmentPaymentRequest = { method: 'ONLINE' | 'CASH' }

/**
 * CashReceiptRequest (backend 147c66e): kỹ thuật viên gửi phiếu thu của lần trả tiền mặt đang mở. `paymentAttemptId` là
 * `current.paymentAttemptId` của khoản; số phiếu 1–100 ký tự; ảnh là tệp PAYMENT_EVIDENCE VERIFIED của chính người gửi;
 * `collectedAt` bỏ trống thì backend lấy giờ gửi (không sau giờ hiện tại quá 5 phút, không trước lúc chọn tiền mặt); ghi chú ≤ 500
 */
export type CashReceiptSubmitRequest = {
  paymentAttemptId: string
  receiptNumber: string
  evidenceFileId: string
  collectedAt?: string | null
  note?: string | null
}

/** CashReceiptReviewRequest khi xác nhận: `revision` của phiếu đang xem, ghi chú ≤ 500 */
export type CashReceiptAcceptRequest = { revision: number; note?: string | null }

/** CashReceiptReviewRequest khi yêu cầu bổ sung: lý do bắt buộc ≤ 500, kỹ thuật viên thấy */
export type CashReceiptRejectRequest = { revision: number; reason: string }

/** Bộ lọc của GET /api/manager/payments/cash-receipts; bỏ `status` là mọi trạng thái */
export type CashReceiptQuery = {
  status?: string | null
  kind?: 'INSTALLMENT' | 'SERVICE_QUOTATION' | null
  page: number
  pageSize: number
}

/** StartSignatureSetRequest: số trang 1–50, ngày ký YYYY-MM-DD, ghi chú ≤ 500 */
export type StartSignatureSetRequest = { expectedPageCount: number; signedOn?: string | null; note?: string | null }

/** SignedPageRequest: tệp SIGNED_CONTRACT_PAGE đã xác minh do chính người gọi tải lên */
export type SignedPageRequest = { fileId: string }

/** FinalizeSignatureSetRequest */
export type FinalizeSignatureSetRequest = { expectedRevision?: number | null }

/** CustomerAcceptanceRequest: lý do bắt buộc khi không nghiệm thu; ảnh / PDF ACCEPTANCE_EVIDENCE chỉ kèm khi không nghiệm thu */
export type CustomerAcceptanceRequest = {
  decision: 'ACCEPT' | 'REQUEST_REWORK' | 'REJECT'
  reason?: string | null
  evidenceFileIds?: string[] | null
  expectedRevision?: number | null
}

/** CollectionActivityRequest */
export type CollectionActivityRequest = {
  kind: 'CONTACT' | 'NEGOTIATION' | 'AGREEMENT' | 'NOTE'
  channel?: 'PHONE' | 'VISIT' | 'ZALO' | 'EMAIL' | 'SMS' | 'OTHER' | null
  summary: string
  /** Bắt buộc với AGREEMENT, YYYY-MM-DD */
  promisedPaymentDate?: string | null
  evidenceFileIds?: string[] | null
  expectedRevision?: number | null
}

/** CollectionDecisionRequest: lý do ≤ 1000 bắt buộc */
export type CollectionDecisionRequest = { reason: string; expectedRevision?: number | null }

/** Bộ lọc của GET /api/contracts */
export type ContractDirectoryQuery = {
  page?: number
  pageSize?: number
  customerId?: string
  status?: string
  paymentPlan?: 'DEPOSIT_30_BALANCE_70' | 'LEGACY'
  surveyRequestId?: string
  propertySiteId?: string
  quotationId?: string
  projectId?: string
  search?: string
  overdue?: boolean
}

/** Bộ lọc của GET /api/collections; `openOnly` mặc định true ở backend */
export type CollectionQuery = {
  page?: number
  pageSize?: number
  status?: string
  openOnly?: boolean
  customerId?: string
  contractId?: string
}
