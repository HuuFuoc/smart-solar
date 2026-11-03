import type { Tone } from '@/components/common/ui/badge'

// Enum và giới hạn của hợp đồng lắp đặt phía nhân viên (Modules.CustomerContracts: ContractStatuses, SignatureOutcomes,
// ContractHandlers; Modules.Payments: PaymentStatuses). Hợp đồng phía khách đọc lại nhãn ở đây khi có màn của khách

/** Nhãn theo người xem: cùng một trạng thái, việc tiếp theo là của kinh doanh, quản lý hay của khách */
export const CONTRACT_STATUSES: Record<string, { staff: string; customer: string; tone: Tone }> = {
  DRAFT: { staff: 'Bản nháp', customer: 'Bản nháp', tone: 'neutral' },
  ISSUED: { staff: 'Đã phát hành, chưa gửi khách', customer: 'Đang chuẩn bị', tone: 'info' },
  AWAITING_SIGNATURE: { staff: 'Chờ khách ký', customer: 'Chờ bạn ký', tone: 'info' },
  UNDER_REVIEW: { staff: 'Chờ duyệt bản ký', customer: 'Đang kiểm tra bản ký', tone: 'info' },
  SIGNATURE_REJECTED: { staff: 'Bản ký bị từ chối', customer: 'Cần ký lại', tone: 'warn' },
  SIGNED: { staff: 'Đã ký, chờ thanh toán', customer: 'Chờ thanh toán', tone: 'info' },
  PAID: { staff: 'Đã thanh toán', customer: 'Đã thanh toán', tone: 'ok' },
  SUPERSEDED: { staff: 'Đã có phụ lục thay', customer: 'Đã có bản mới', tone: 'neutral' },
  /** Chỉ có ở backend từ 31/10/2026: bản nháp đầu bị kinh doanh huỷ */
  DISCARDED: { staff: 'Bản nháp đã huỷ', customer: 'Đã huỷ', tone: 'neutral' },
}

/** ContractEvent.EventType, cho lịch sử phía nhân viên */
export const CONTRACT_EVENT_TYPES: Record<string, string> = {
  CREATED: 'Lập hợp đồng',
  AMENDMENT_CREATED: 'Lập phụ lục',
  UPDATED: 'Sửa bản nháp',
  STATUS_CHANGED: 'Đổi trạng thái',
  OFFICIAL_DOCUMENT_ATTACHED: 'Gắn PDF chính thức',
  SUPERSEDED: 'Bị phụ lục thay',
}

/** SignatureOutcomes của một lần khách gửi bản ký */
export const SIGNATURE_OUTCOMES: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ duyệt', tone: 'info' },
  APPROVED: { label: 'Đã duyệt', tone: 'ok' },
  REJECTED: { label: 'Bị từ chối', tone: 'neutral' },
}

/** Quyết định duyệt bản ký (ContractReviewRequest.decision) */
export const CONTRACT_REVIEW_DECISIONS = {
  approve: 'APPROVE',
  reject: 'REJECT',
} as const

/**
 * PaymentStatuses của một link PayOS, nhãn cho nhân viên. Chỉ backend xác nhận đã nhận tiền (webhook có chữ ký hoặc đối
 * soát với PayOS); nhân viên không tự đánh dấu. REVIEW_REQUIRED, REFUND_REQUIRED cần người xử lý tay
 */
export const STAFF_PAYMENT_ATTEMPT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ khách trả tiền', tone: 'info' },
  PROCESSING: { label: 'PayOS đang xử lý', tone: 'info' },
  PAID: { label: 'Đã nhận tiền', tone: 'ok' },
  CANCELLED: { label: 'Link đã huỷ', tone: 'neutral' },
  EXPIRED: { label: 'Link hết hạn', tone: 'neutral' },
  FAILED: { label: 'Không tạo được link', tone: 'neutral' },
  REVIEW_REQUIRED: { label: 'Cần kiểm tra: số tiền không khớp', tone: 'danger' },
  REFUND_REQUIRED: { label: 'Cần hoàn tiền: trả hai lần', tone: 'danger' },
}

/** PaymentEvent.EventType (PaymentService) */
export const PAYMENT_EVENT_TYPES: Record<string, string> = {
  CREATED: 'Khách tạo lần thanh toán',
  LINK_CREATED: 'Đã có link PayOS',
  LINK_FAILED: 'Không tạo được link PayOS',
  STATUS_CHANGED: 'Đổi trạng thái',
  PAID: 'Đã nhận tiền',
  AMOUNT_MISMATCH: 'Số tiền nhận được không khớp',
  DUPLICATE_PAYMENT: 'Khách trả lần hai',
  CONTRACT_STATE_MISMATCH: 'Nhận tiền khi hợp đồng không ở trạng thái đã ký',
}

/** PaymentSources của lịch sử thanh toán */
export const PAYMENT_EVENT_SOURCES: Record<string, string> = {
  WEBHOOK: 'PayOS báo về',
  RECONCILIATION: 'Đối soát với PayOS',
  CUSTOMER: 'Khách',
  SYSTEM: 'Hệ thống',
}

/** Giới hạn của backend (cột trong DB, Trim của ContractHandlers) */
export const CONTRACT_LIMITS = {
  /** Điều khoản dài hơn bị backend cắt */
  termsLength: 8000,
  /** Lý do từ chối bản ký */
  rejectionReasonLength: 2000,
  /** Mỗi người 10 lệnh ghi / phút, 60 lệnh đọc / phút */
  writesPerMinute: 10,
} as const
