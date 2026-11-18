import type { Tone } from '@/components/common/ui/badge'

// Enum và giới hạn của báo giá lắp đặt (Modules.Quotations của backend: QuotationStatuses, QuotationOrigins, QuotationOptions,
// QuotationTechnicianCart). Khác báo giá sửa chữa, bảo trì ở common/afterSales.ts

/** Nhãn theo người xem: cùng một trạng thái, việc tiếp theo là của nhân viên hay của khách */
export const QUOTATION_STATUSES: Record<string, { staff: string; customer: string; tone: Tone }> = {
  DRAFT: { staff: 'Bản nháp', customer: 'Bản nháp', tone: 'neutral' },
  ISSUED: { staff: 'Đã chốt giá, chờ khách quyết định', customer: 'Chờ bạn trả lời', tone: 'info' },
  ACCEPTED: { staff: 'Khách đã đồng ý', customer: 'Đã đồng ý', tone: 'ok' },
  REVISION_REQUESTED: { staff: 'Khách muốn sửa', customer: 'Đã yêu cầu sửa', tone: 'warn' },
  SUPERSEDED: { staff: 'Đã có bản mới', customer: 'Đã có bản mới', tone: 'neutral' },
  REJECTED: { staff: 'Khách không đồng ý', customer: 'Bạn đã từ chối', tone: 'neutral' },
  CANCELLED: { staff: 'Đã đóng', customer: 'Đã đóng', tone: 'neutral' },
}

/**
 * Kỹ thuật viên ghi điều khách quyết định tại công trình (OnSiteDecisions). DECLINED / REVISION_NEEDED bắt buộc ghi chú; cả ba
 * gửi `revision` của bản đang trình bày
 */
export const ON_SITE_DECISIONS = {
  agreed: 'AGREED',
  declined: 'DECLINED',
  revisionNeeded: 'REVISION_NEEDED',
} as const

export type OnSiteDecision = (typeof ON_SITE_DECISIONS)[keyof typeof ON_SITE_DECISIONS]

/** Ghi chú của quyết định tại công trình: backend cắt ở 1000 ký tự */
export const ON_SITE_NOTE_MAX = 1000

/** Cách trả tại công trình: QR PayOS trên máy kỹ thuật viên, hoặc tiền mặt (quản lý / quản trị xác nhận đã thu) */
export const ON_SITE_PAYMENT_METHODS = { online: 'ONLINE', cash: 'CASH' } as const

/** QuotationPaymentStates, theo góc nhìn kỹ thuật viên. Đỏ là việc kỹ thuật viên phải làm ngay */
export const QUOTATION_PAYMENT_STATES: Record<string, { label: string; tone: Tone }> = {
  NOT_PAYABLE: { label: 'Chưa thanh toán được', tone: 'neutral' },
  AWAITING_PAYMENT: { label: 'Chờ mở thanh toán', tone: 'danger' },
  ONLINE_IN_PROGRESS: { label: 'Đang chờ khách quét QR', tone: 'info' },
  AWAITING_CASH_CONFIRMATION: { label: 'Chờ quản lý xác nhận tiền mặt', tone: 'info' },
  PAID: { label: 'Đã thanh toán, đã lập hợp đồng', tone: 'ok' },
  REVIEW_REQUIRED: { label: 'Tiền về nhưng cần quản lý xử lý', tone: 'warn' },
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
  ISSUED: 'Chốt giá',
  AGREED_ON_SITE: 'Khách đồng ý tại công trình',
  DECLINED_ON_SITE: 'Khách không đồng ý tại công trình',
  REVISION_REQUESTED_ON_SITE: 'Khách muốn sửa (ghi tại công trình)',
  ACCEPTED: 'Khách đồng ý trong ứng dụng (cách cũ)',
  REJECTED: 'Khách từ chối trong ứng dụng (cách cũ)',
  REVISION_REQUESTED: 'Khách yêu cầu sửa trong ứng dụng (cách cũ)',
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
