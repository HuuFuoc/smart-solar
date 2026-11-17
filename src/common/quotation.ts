import type { Tone } from '@/components/common/ui/badge'

// Enum và giới hạn của báo giá lắp đặt (Modules.Quotations của backend: QuotationStatuses, QuotationOrigins, QuotationOptions,
// QuotationTechnicianCart). Khác báo giá sửa chữa, bảo trì ở common/afterSales.ts

/** Nhãn theo người xem: cùng một trạng thái, việc tiếp theo là của nhân viên hay của khách */
export const QUOTATION_STATUSES: Record<string, { staff: string; customer: string; tone: Tone }> = {
  DRAFT: { staff: 'Bản nháp', customer: 'Bản nháp', tone: 'neutral' },
  ISSUED: { staff: 'Chờ khách trả lời', customer: 'Chờ bạn trả lời', tone: 'info' },
  ACCEPTED: { staff: 'Khách đã đồng ý', customer: 'Đã đồng ý', tone: 'ok' },
  REVISION_REQUESTED: { staff: 'Khách yêu cầu sửa', customer: 'Đã yêu cầu sửa', tone: 'warn' },
  SUPERSEDED: { staff: 'Đã có bản mới', customer: 'Đã có bản mới', tone: 'neutral' },
  REJECTED: { staff: 'Khách từ chối', customer: 'Bạn đã từ chối', tone: 'neutral' },
  CANCELLED: { staff: 'Đã đóng', customer: 'Đã đóng', tone: 'neutral' },
}

/** Ai lập báo giá. Báo giá cũ của kinh doanh / tự động vẫn đọc được, không sửa được nữa */
export const QUOTATION_ORIGINS: Record<string, string> = {
  TECHNICIAN: 'Kỹ thuật viên khảo sát lập',
  SALES: 'Kinh doanh lập (cách cũ)',
  AUTOMATIC: 'Hệ thống tự lập (cách cũ)',
}

/** QuotationEventTypes, cho lịch sử của nhân viên */
export const QUOTATION_EVENT_TYPES: Record<string, string> = {
  CREATED: 'Lập bản nháp',
  UPDATED: 'Sửa bản nháp',
  ISSUED: 'Gửi khách',
  ACCEPTED: 'Khách đồng ý',
  REJECTED: 'Khách từ chối',
  REVISION_REQUESTED: 'Khách yêu cầu sửa',
  REVISION_CREATED: 'Lập bản sửa',
  SUPERSEDED: 'Bị thay bằng bản mới',
  SURVEY_VERSION_CONFIRMED: 'Cập nhật theo biên bản khảo sát mới',
  CANCELLED: 'Đóng',
  DOCUMENT_ATTACHED: 'Gắn tệp báo giá',
}

/** Giới hạn của backend; tiền là VND nguyên, backend làm tròn mọi số tiền */
export const QUOTATION_LIMITS = {
  maxLines: 100,
  /** Một dòng của giỏ: lớn hơn 0, tối đa 100 000, tới 3 chữ số thập phân */
  maxQuantity: 100_000,
  quantityDecimals: 3,
  reasonLength: 2000,
} as const
