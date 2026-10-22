// Viết tay vì swagger của tag SalesQuotations và CustomerQuotations chỉ khai "200 OK". Theo record C# của backend `main`
// (7c79fa8): Modules.Quotations (QuotationView, QuotationLineView, QuotationEventView). Kinh doanh và khách nhận cùng một
// view; khách không bao giờ thấy bản nháp, `events` chỉ có ở GET chi tiết và các lệnh ghi của kinh doanh

/** DRAFT | ISSUED | ACCEPTED | REVISION_REQUESTED | SUPERSEDED */
export type QuotationStatus = 'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'REVISION_REQUESTED' | 'SUPERSEDED' | (string & {})

/** Một dòng hàng. Dòng chọn từ danh mục có `productId`, `sku`, `brand`, `model` chép lúc thêm (không đổi theo danh mục) */
export type QuotationLineView = {
  lineId: string
  lineNumber: number
  productId: string | null
  sku: string | null
  name: string
  brand: string | null
  model: string | null
  unit: string
  quantity: number
  unitPrice: number
  /** Giá trong danh mục lúc thêm dòng, để biết kinh doanh đã đổi giá; null với dòng tự ghi */
  catalogUnitPrice: number | null
  lineTotal: number
  description: string | null
}

/** CREATED | UPDATED | ISSUED | ACCEPTED | REVISION_REQUESTED | REVISION_CREATED | SUPERSEDED | DOCUMENT_ATTACHED */
export type QuotationEventView = {
  eventType: string
  actorUserId: string
  detail: string | null
  createdAt: string
}

/**
 * GET /survey-requests/{id}/quotations, /quotations/{id} và mọi lệnh ghi của kinh doanh; GET /customers/me/quotations(/{id}),
 * accept, revision-request của khách. Tiền là VND nguyên, backend tự tính mọi tổng:
 * cộng = thiết bị + nhân công + vận chuyển + dịch vụ khác; thuế tính trên (cộng − giảm giá); tổng = (cộng − giảm giá) + thuế
 */
export type QuotationView = {
  quotationId: string
  /** "QT-20261022-ABC234", giữ nguyên qua các bản sửa */
  quoteNumber: string
  surveyRequestId: string
  version: number
  previousQuotationId: string | null
  status: QuotationStatus
  currency: string
  lines: QuotationLineView[]
  equipmentSubtotal: number
  laborCost: number
  transportCost: number
  otherServiceCost: number
  subtotal: number
  discountAmount: number
  taxRatePercent: number
  taxAmount: number
  totalAmount: number
  validUntil: string | null
  isExpired: boolean
  /** ISSUED và chưa hết hạn */
  canAccept: boolean
  terms: string | null
  notes: string | null
  documentFileId: string | null
  onSiteSurveyReportId: string
  onSiteSurveyVersion: number
  issuedAt: string | null
  acceptedAt: string | null
  /** Lý do khách yêu cầu sửa (trên bản khách gửi lại) */
  revisionReason: string | null
  /** Gửi làm `revision` khi sửa bản nháp / gửi khách */
  revision: number
  events: QuotationEventView[] | null
}
