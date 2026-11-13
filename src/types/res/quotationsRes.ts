// Viết tay vì swagger của tag SalesQuotations và CustomerQuotations chỉ khai "200 OK". Theo record C# của backend `main`
// (58f9635): Modules.Quotations (QuotationView, QuotationLineView, QuotationEventView, PricingApprovalView). Kinh doanh, quản
// lý và khách nhận cùng một view; khách không bao giờ thấy bản nháp, giá danh mục, phần duyệt giá và phần rà giá

/** REJECTED (khách từ chối) và CANCELLED (yêu cầu khảo sát bị rút / đóng khi báo giá còn mở) là trạng thái cuối */
export type QuotationStatus =
  'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'REVISION_REQUESTED' | 'SUPERSEDED' | 'REJECTED' | 'CANCELLED' | (string & {})

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

/** Vì sao bản tự động chưa gửi khách được (PricingIssueCodes). `message` là câu tiếng Anh, giao diện dịch theo `code` */
export type PricingIssue = {
  code: string
  message: string
  productId: string | null
}

/** Một mục trong danh sách thiết bị / dịch vụ của biên bản khảo sát, kèm giá danh mục lúc tạo (null: chưa định giá được) */
export type PricedItem = {
  productId: string
  sku: string | null
  name: string | null
  productType: string | null
  unit: string | null
  quantity: number
  unitPrice: number | null
  lineTotal: number | null
}

/** Bản tự động được tính từ đâu; ghi một lần lúc tạo, không đổi theo các lần sửa */
export type PricingBasis = {
  onSiteSurveyVersion: number
  selectedSimulationId: string | null
  installedCapacityKwp: number | null
  installationFeasibility: string | null
  installationNotes: string | null
  materials: PricedItem[]
  services: PricedItem[]
  issues: PricingIssue[]
  pricedAt: string
}

/** Vấn đề về giá của bản nháp tự động còn chưa xử lý. `noteRequired`: còn vấn đề chỉ cần ghi lý do là gửi được */
export type PricingReview = {
  outstanding: PricingIssue[]
  noteRequired: boolean
}

/** Một chỗ giá thấp hơn danh mục: giảm giá cả báo giá (`amount`), dòng giảm đơn giá, hoặc dòng giá 0 */
export type PriceAdjustment = {
  kind: 'DISCOUNT' | 'REDUCED_UNIT_PRICE' | 'ZERO_PRICE' | (string & {})
  lineNumber: number | null
  productId: string | null
  catalogUnitPrice: number | null
  unitPrice: number | null
  amount: number | null
}

export type PricingApprovalStep = {
  eventType: string
  actorUserId: string
  reason: string | null
  at: string
}

/**
 * Duyệt giá của quản lý cho đúng bộ giá đang có (`fingerprint`). Sửa giá sau khi xin hoặc sau khi được duyệt thì về lại
 * REQUIRED, `request` và `decision` thành null
 */
export type PricingApprovalView = {
  status: 'NOT_REQUIRED' | 'REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED' | (string & {})
  adjustments: PriceAdjustment[]
  fingerprint: string
  request: PricingApprovalStep | null
  decision: PricingApprovalStep | null
}

/** POST /survey-requests/{id}/quotations/generate. `outcome`: AutomaticQuotationOutcomes; `quotation` null khi không tạo */
export type AutomaticQuotationResult = {
  outcome: string
  quotation: QuotationView | null
  issues: PricingIssue[]
}

/**
 * GET /survey-requests/{id}/quotations, /quotations/{id}, /quotations/pending-review, /manager/quotations/pricing-approvals và
 * mọi lệnh ghi của kinh doanh, quản lý; GET /customers/me/quotations(/{id}), accept, reject, revision-request của khách.
 * Tiền là VND nguyên, backend tự tính mọi tổng:
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
  /** ISSUED, chưa hết hạn và biên bản khảo sát chưa đổi sau khi lập */
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
  /** SALES: kinh doanh lập; AUTOMATIC: hệ thống tính từ danh sách thiết bị của biên bản khảo sát */
  origin: 'SALES' | 'AUTOMATIC' | (string & {})
  /** Chỉ bản tự động, không gửi cho khách */
  pricingBasis: PricingBasis | null
  currentSurveyVersion: number | null
  /** Biên bản khảo sát được bổ sung sau khi lập bản này: không gửi, không đồng ý, không lập hợp đồng được tới khi kinh doanh xử lý */
  surveyChanged: boolean
  /** Chỉ bản nháp tự động, không gửi cho khách */
  pricingReview: PricingReview | null
  /** Không gửi cho khách */
  pricingApproval: PricingApprovalView | null
  /** Lúc khách từ chối (REJECTED) hoặc lúc bị đóng theo yêu cầu khảo sát (CANCELLED) */
  closedAt: string | null
  closeReason: string | null
}
