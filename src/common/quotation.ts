import type { Tone } from '@/components/common/ui/badge'

// Enum và giới hạn của báo giá lắp đặt (Modules.Quotations của backend: QuotationStatuses, QuotationOptions,
// QuotationPricing, ValidateHeader). Khác báo giá sửa chữa, bảo trì ở common/afterSales.ts

/** Nhãn theo người xem: cùng một trạng thái, việc tiếp theo là của kinh doanh hay của khách */
export const QUOTATION_STATUSES: Record<string, { sales: string; customer: string; tone: Tone }> = {
  DRAFT: { sales: 'Bản nháp', customer: 'Bản nháp', tone: 'neutral' },
  ISSUED: { sales: 'Chờ khách trả lời', customer: 'Chờ bạn trả lời', tone: 'info' },
  ACCEPTED: { sales: 'Khách đã đồng ý', customer: 'Đã đồng ý', tone: 'ok' },
  REVISION_REQUESTED: { sales: 'Khách yêu cầu sửa', customer: 'Đã yêu cầu sửa', tone: 'warn' },
  SUPERSEDED: { sales: 'Đã có bản mới', customer: 'Đã có bản mới', tone: 'neutral' },
  REJECTED: { sales: 'Khách từ chối', customer: 'Đã từ chối', tone: 'neutral' },
  CANCELLED: { sales: 'Đã huỷ', customer: 'Đã huỷ', tone: 'neutral' },
}

/** QuotationEventTypes, cho lịch sử của kinh doanh */
export const QUOTATION_EVENT_TYPES: Record<string, string> = {
  AUTOMATICALLY_GENERATED: 'Hệ thống tự lập theo biên bản khảo sát',
  CREATED: 'Lập bản nháp',
  UPDATED: 'Sửa bản nháp',
  SURVEY_AMENDED: 'Biên bản khảo sát được bổ sung',
  SURVEY_VERSION_CONFIRMED: 'Xác nhận theo biên bản mới',
  PRICING_APPROVAL_REQUESTED: 'Xin quản lý duyệt giá',
  PRICING_APPROVED: 'Quản lý duyệt giá',
  PRICING_REJECTED: 'Quản lý không duyệt giá',
  ISSUED: 'Gửi khách',
  ACCEPTED: 'Khách đồng ý',
  REJECTED: 'Khách từ chối',
  REVISION_REQUESTED: 'Khách yêu cầu sửa',
  REVISION_CREATED: 'Lập bản sửa',
  SUPERSEDED: 'Bị thay bằng bản mới',
  DOCUMENT_ATTACHED: 'Gắn tệp báo giá',
  CANCELLED: 'Huỷ vì yêu cầu đã đóng',
}

/** PricingApprovalStatuses. Nhãn theo người xem: kinh doanh xin duyệt, quản lý duyệt */
export const PRICING_APPROVAL_STATUSES: Record<string, { sales: string; manager: string; tone: Tone }> = {
  NOT_REQUIRED: { sales: 'Đúng giá danh mục', manager: 'Không cần duyệt', tone: 'neutral' },
  REQUIRED: { sales: 'Cần quản lý duyệt giá', manager: 'Chưa xin duyệt', tone: 'warn' },
  PENDING: { sales: 'Chờ quản lý duyệt giá', manager: 'Chờ bạn duyệt', tone: 'info' },
  APPROVED: { sales: 'Quản lý đã duyệt giá', manager: 'Đã duyệt', tone: 'ok' },
  REJECTED: { sales: 'Quản lý không duyệt giá', manager: 'Không duyệt', tone: 'warn' },
}

/** PriceAdjustmentKinds: vì sao bộ giá cần quản lý duyệt */
export const PRICE_ADJUSTMENT_KINDS: Record<string, string> = {
  DISCOUNT: 'Giảm giá',
  REDUCED_UNIT_PRICE: 'Đơn giá thấp hơn giá danh mục',
  ZERO_PRICE: 'Đơn giá 0 đ',
}

/**
 * PricingIssueCodes của bản nháp hệ thống tự lập. `acknowledgeable`: gửi khách được nếu ghi lý do chấp nhận (`reviewNote`); còn
 * lại phải sửa xong mới gửi được
 */
export const PRICING_ISSUES: Record<string, { label: string; acknowledgeable: boolean }> = {
  PRODUCT_UNAVAILABLE: {
    label: 'Có sản phẩm trong biên bản đã ngừng bán hoặc không còn trong danh mục.',
    acknowledgeable: true,
  },
  WRONG_ITEM_KIND: { label: 'Có hạng mục trong biên bản không đúng loại sản phẩm.', acknowledgeable: true },
  CURRENCY_NOT_SUPPORTED: { label: 'Có sản phẩm không bán bằng VND.', acknowledgeable: true },
  CONDITIONS_REQUIRE_REVIEW: {
    label: 'Kỹ thuật viên ghi công trình chỉ lắp được khi có điều kiện. Xem lại kết quả khảo sát.',
    acknowledgeable: true,
  },
  PRICE_MISSING: { label: 'Có sản phẩm chưa có giá trong danh mục. Nhập đơn giá cho dòng đó.', acknowledgeable: false },
  MISSING_SOLAR_PANEL: { label: 'Chưa có dòng tấm pin.', acknowledgeable: false },
  MISSING_INVERTER: { label: 'Chưa có dòng inverter.', acknowledgeable: false },
  LABOR_NOT_SPECIFIED: { label: 'Chưa có chi phí nhân công lắp đặt.', acknowledgeable: false },
  INVALID_TOTAL: { label: 'Tổng tiền chưa hợp lệ.', acknowledgeable: false },
}

/** Giới hạn của backend; tiền là VND nguyên, backend làm tròn mọi số tiền */
export const QUOTATION_LIMITS = {
  maxLines: 100,
  maxAmount: 999_999_999_999,
  maxQuantity: 100_000,
  /** Thuế suất 0–20 %, bỏ trống thì backend dùng mặc định */
  maxTaxRatePercent: 20,
  defaultTaxRatePercent: 8,
  /** Hạn hiệu lực tối đa tính từ lúc lưu */
  maxValidityDays: 90,
  defaultValidityDays: 30,
  nameLength: 255,
  unitLength: 20,
  lineDescriptionLength: 500,
  termsLength: 4000,
  notesLength: 2000,
  reasonLength: 2000,
  /** Lý do xin duyệt giá, quyết định duyệt, xác nhận theo biên bản mới, ghi chú chấp nhận vấn đề giá */
  approvalReasonLength: 1000,
  reviewNoteLength: 1000,
} as const

/** Đơn vị hay dùng cho dòng tự ghi, vẫn gõ được đơn vị khác */
export const QUOTATION_UNIT_SUGGESTIONS = ['bộ', 'cái', 'tấm', 'm', 'cuộn', 'gói', 'lần']
