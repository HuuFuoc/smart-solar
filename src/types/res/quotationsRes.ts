// Viết tay vì swagger của tag SalesQuotations và CustomerQuotations chỉ khai "200 OK". Theo record C# của backend `main`
// (66cb7af): Modules.Quotations (QuotationView, QuotationLineView, QuotationEventView, PricingApprovalView, PricingReview).
// Kinh doanh và khách nhận cùng một view; khách không bao giờ thấy bản nháp, `events` chỉ có ở GET chi tiết và các lệnh ghi
// của kinh doanh; `pricingApproval` là null với khách

/** DRAFT | ISSUED | ACCEPTED | REVISION_REQUESTED | SUPERSEDED | REJECTED | CANCELLED */
export type QuotationStatus =
  'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'REVISION_REQUESTED' | 'SUPERSEDED' | 'REJECTED' | 'CANCELLED' | (string & {})

/** Vấn đề giá của bản nháp tự lập (PricingIssueCodes): mã + câu tiếng Anh của backend, có khi kèm sản phẩm */
export type PricingIssue = {
  code: string
  message: string | null
  productId?: string | null
}

/** Chỉ có ở bản nháp AUTOMATIC: vấn đề lúc tự lập chưa được xử lý; `noteRequired` = còn vấn đề gửi được nếu có ghi chú */
export type PricingReview = {
  outstanding: PricingIssue[]
  noteRequired: boolean
}

/** Một điểm lệch giá cần quản lý duyệt: DISCOUNT (giảm giá phần đầu), REDUCED_UNIT_PRICE (dưới giá danh mục), ZERO_PRICE */
export type PriceAdjustment = {
  kind: string
  lineNumber: number | null
  productId: string | null
  catalogUnitPrice: number | null
  unitPrice: number | null
  /** Số tiền giảm: giảm giá phần đầu, hoặc (giá danh mục − đơn giá) × số lượng */
  amount: number | null
}

export type PricingApprovalStep = {
  eventType: string
  actorUserId: string
  reason: string | null
  at: string
}

/**
 * Duyệt giá của bộ giá hiện tại. NOT_REQUIRED | REQUIRED | PENDING | APPROVED | REJECTED. Gắn với đúng bộ giá (`fingerprint`):
 * sửa bất kỳ số nào sau khi duyệt là về REQUIRED
 */
export type PricingApprovalView = {
  status: string
  adjustments: PriceAdjustment[]
  fingerprint: string
  request: PricingApprovalStep | null
  decision: PricingApprovalStep | null
}

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
  /** SALES (kinh doanh lập) | AUTOMATIC (backend tự lập từ biên bản khảo sát). Bản cũ không có trường này */
  origin?: string
  /** Phiên bản biên bản khảo sát hiện tại; khác `onSiteSurveyVersion` thì `surveyChanged` */
  currentSurveyVersion?: number | null
  /** Biên bản đã bổ sung sau khi lập báo giá: không gửi / đồng ý được cho tới khi kinh doanh xác nhận lại hoặc lập bản sửa */
  surveyChanged?: boolean
  pricingReview?: PricingReview | null
  pricingApproval?: PricingApprovalView | null
  closedAt?: string | null
  closeReason?: string | null
}
