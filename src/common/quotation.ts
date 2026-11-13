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
  REJECTED: { sales: 'Khách từ chối', customer: 'Bạn đã từ chối', tone: 'neutral' },
  CANCELLED: { sales: 'Đã đóng cùng yêu cầu', customer: 'Đã đóng', tone: 'neutral' },
}

/** PricingApprovalStatuses: quản lý duyệt bộ giá có giảm giá, đơn giá thấp hơn danh mục hoặc giá 0. NOT_REQUIRED không hiện */
export const PRICING_APPROVAL_STATUSES: Record<string, { label: string; tone: 'info' | 'ok' | 'warn' }> = {
  REQUIRED: { label: 'Giá thấp hơn danh mục, cần quản lý duyệt', tone: 'warn' },
  PENDING: { label: 'Chờ quản lý duyệt giá', tone: 'info' },
  APPROVED: { label: 'Quản lý đã duyệt giá', tone: 'ok' },
  REJECTED: { label: 'Quản lý không duyệt giá', tone: 'warn' },
}

/** AutomaticQuotationOutcomes: kết quả khi kinh doanh bấm tạo báo giá từ biên bản khảo sát */
export const AUTOMATIC_QUOTATION_OUTCOMES: Record<string, string> = {
  AUTO_ISSUED: 'Đã tạo báo giá theo giá danh mục và gửi cho khách.',
  PENDING_SALES_REVIEW: 'Đã tạo bản nháp. Còn vấn đề về giá cần bạn xử lý trước khi gửi khách.',
  ALREADY_GENERATED: 'Biên bản khảo sát này đã có báo giá.',
  MANUAL_QUOTATION_REQUIRED:
    'Biên bản khảo sát chưa có danh sách thiết bị nên không tạo tự động được. Bấm Lập báo giá rồi tự thêm dòng hàng.',
  NOT_FEASIBLE: 'Kỹ thuật viên kết luận công trình không lắp được nên không lập báo giá.',
  SALES_OWNER_REQUIRED: 'Yêu cầu chưa có nhân viên kinh doanh phụ trách nên chưa tạo báo giá được.',
  SURVEY_CHANGED_REVIEW_REQUIRED: 'Biên bản khảo sát đã được bổ sung sau báo giá hiện có. Lập bản sửa từ báo giá đó.',
  SURVEY_NOT_COMPLETED: 'Kỹ thuật viên chưa hoàn thành khảo sát tại công trình.',
  REQUEST_CLOSED: 'Yêu cầu đã đóng hoặc khách đã rút nên không lập báo giá.',
}

/** QuotationEventTypes, cho lịch sử của kinh doanh */
export const QUOTATION_EVENT_TYPES: Record<string, string> = {
  CREATED: 'Lập bản nháp',
  UPDATED: 'Sửa bản nháp',
  ISSUED: 'Gửi khách',
  ACCEPTED: 'Khách đồng ý',
  REVISION_REQUESTED: 'Khách yêu cầu sửa',
  REVISION_CREATED: 'Lập bản sửa',
  SUPERSEDED: 'Bị thay bằng bản mới',
  DOCUMENT_ATTACHED: 'Gắn tệp báo giá',
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
} as const

/** Đơn vị hay dùng cho dòng tự ghi, vẫn gõ được đơn vị khác */
export const QUOTATION_UNIT_SUGGESTIONS = ['bộ', 'cái', 'tấm', 'm', 'cuộn', 'gói', 'lần']
