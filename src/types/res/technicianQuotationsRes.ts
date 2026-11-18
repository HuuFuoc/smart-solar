/* Sinh tự động từ docs/api/swagger.json bằng `npm run gen:api`, KHÔNG sửa tay. */

export type PriceAdjustment = {
  kind?: string | null
  /** Format: int32 */
  lineNumber?: number | null
  /** Format: uuid */
  productId?: string | null
  /** Format: double */
  catalogUnitPrice?: number | null
  /** Format: double */
  unitPrice?: number | null
  /** Format: double */
  amount?: number | null
}

export type PricedItem = {
  /** Format: uuid */
  productId?: string
  sku?: string | null
  name?: string | null
  productType?: string | null
  unit?: string | null
  /** Format: double */
  quantity?: number
  /** Format: double */
  unitPrice?: number | null
  /** Format: double */
  lineTotal?: number | null
}

export type PricingApprovalStep = {
  eventType?: string | null
  /** Format: uuid */
  actorUserId?: string
  reason?: string | null
  /** Format: date-time */
  at?: string
}

export type PricingApprovalView = {
  status?: string | null
  adjustments?: PriceAdjustment[] | null
  fingerprint?: string | null
  request?: PricingApprovalStep
  decision?: PricingApprovalStep
}

export type PricingBasis = {
  /** Format: int32 */
  onSiteSurveyVersion?: number
  /** Format: uuid */
  selectedSimulationId?: string | null
  /** Format: double */
  installedCapacityKwp?: number | null
  installationFeasibility?: string | null
  installationNotes?: string | null
  materials?: PricedItem[] | null
  services?: PricedItem[] | null
  issues?: PricingIssue[] | null
  /** Format: date-time */
  pricedAt?: string
}

export type PricingIssue = {
  code?: string | null
  message?: string | null
  /** Format: uuid */
  productId?: string | null
}

export type PricingReview = {
  outstanding?: PricingIssue[] | null
  noteRequired?: boolean
}

export type QuotationEventView = {
  eventType?: string | null
  /** Format: uuid */
  actorUserId?: string
  detail?: string | null
  /** Format: date-time */
  createdAt?: string
}

export type QuotationLineView = {
  /** Format: uuid */
  lineId?: string
  /** Format: int32 */
  lineNumber?: number
  /** Format: uuid */
  productId?: string | null
  sku?: string | null
  name?: string | null
  brand?: string | null
  model?: string | null
  unit?: string | null
  /** Format: double */
  quantity?: number
  /** Format: double */
  unitPrice?: number
  /** Format: double */
  catalogUnitPrice?: number | null
  /** Format: double */
  lineTotal?: number
  description?: string | null
}

export type QuotationView = {
  /** Format: uuid */
  quotationId?: string
  quoteNumber?: string | null
  /** Format: uuid */
  surveyRequestId?: string
  /** Format: int32 */
  version?: number
  /** Format: uuid */
  previousQuotationId?: string | null
  status?: string | null
  currency?: string | null
  lines?: QuotationLineView[] | null
  /** Format: double */
  equipmentSubtotal?: number
  /** Format: double */
  laborCost?: number
  /** Format: double */
  transportCost?: number
  /** Format: double */
  otherServiceCost?: number
  /** Format: double */
  subtotal?: number
  /** Format: double */
  discountAmount?: number
  /** Format: double */
  taxRatePercent?: number
  /** Format: double */
  taxAmount?: number
  /** Format: double */
  totalAmount?: number
  /** Format: date-time */
  validUntil?: string | null
  isExpired?: boolean
  canAccept?: boolean
  terms?: string | null
  notes?: string | null
  /** Format: uuid */
  documentFileId?: string | null
  /** Format: uuid */
  onSiteSurveyReportId?: string
  /** Format: int32 */
  onSiteSurveyVersion?: number
  /** Format: date-time */
  issuedAt?: string | null
  /** Format: date-time */
  acceptedAt?: string | null
  revisionReason?: string | null
  /** Format: int32 */
  revision?: number
  events?: QuotationEventView[] | null
  origin?: string | null
  pricingBasis?: PricingBasis
  /** Format: int32 */
  currentSurveyVersion?: number | null
  surveyChanged?: boolean
  pricingReview?: PricingReview
  pricingApproval?: PricingApprovalView
  /** Format: date-time */
  closedAt?: string | null
  closeReason?: string | null
}
