import type { Tone } from '@/components/common/ui/badge'

// Enum của gói thanh toán 30/70, hợp đồng ký giấy và thu hồi công nợ (backend 7d27054: PaymentPlanStages, InstallmentStatuses,
// InstallmentPaymentStates, SignatureSetStatuses, CollectionCaseStatuses, CollectionActivityKinds, CollectionHandlers.Channels)

export const PAYMENT_PLAN_CODE = 'DEPOSIT_30_BALANCE_70'

/** Bộ lọc gói thanh toán của danh sách hợp đồng */
export const PAYMENT_PLAN_FILTERS: Record<string, string> = {
  DEPOSIT_30_BALANCE_70: 'Trả 30/70',
  LEGACY: 'Trả 100% (cách cũ)',
}

/** Chặng của hợp đồng 30/70, theo người xem */
export const PAYMENT_PLAN_STAGES: Record<string, { staff: string; customer: string; tone: Tone }> = {
  DRAFT_CREATED: { staff: 'Chờ khách trả 30%', customer: 'Chờ bạn trả 30%', tone: 'info' },
  DEPOSIT_VERIFIED: { staff: 'Đã nhận 30%, chờ ký giấy', customer: 'Đã trả 30%, chờ ký giấy', tone: 'info' },
  READY_FOR_INSTALLATION: { staff: 'Đã ký giấy, sẵn sàng thi công', customer: 'Đã ký giấy, chờ thi công', tone: 'ok' },
  BALANCE_DUE: { staff: 'Khoản 70% đến hạn', customer: 'Khoản 70% đến hạn', tone: 'info' },
  BALANCE_OVERDUE: { staff: 'Khoản 70% quá hạn', customer: 'Khoản 70% quá hạn', tone: 'danger' },
  FULLY_PAID: { staff: 'Đã trả đủ 100%', customer: 'Đã trả đủ 100%', tone: 'neutral' },
  DISCARDED: { staff: 'Đã huỷ trước khi trả 30%', customer: 'Đã huỷ', tone: 'neutral' },
  /** Hợp đồng cũ trong danh sách hợp đồng */
  LEGACY: { staff: 'Trả 100% (cách cũ)', customer: 'Trả 100%', tone: 'neutral' },
}

export const INSTALLMENT_KINDS: Record<string, string> = {
  DEPOSIT: 'Khoản 30%',
  BALANCE: 'Khoản 70%',
}

export const INSTALLMENT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chưa tới lúc trả', tone: 'neutral' },
  DUE: { label: 'Đến hạn trả', tone: 'info' },
  PAID: { label: 'Đã trả', tone: 'ok' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

export const INSTALLMENT_PAYMENT_STATES: Record<string, { label: string; tone: Tone }> = {
  NOT_PAYABLE: { label: 'Chưa trả được', tone: 'neutral' },
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', tone: 'info' },
  ONLINE_IN_PROGRESS: { label: 'Đang chờ khách quét mã', tone: 'info' },
  AWAITING_CASH_CONFIRMATION: { label: 'Chờ quản lý xác nhận tiền mặt', tone: 'info' },
  PAID: { label: 'Đã trả', tone: 'ok' },
}

export const OWNERSHIP_STATUSES: Record<string, string> = {
  OWNERSHIP_RETAINED: 'Smart Solar giữ quyền sở hữu thiết bị tới khi trả đủ (theo điều khoản)',
  OWNERSHIP_TRANSFER_ELIGIBLE: 'Đủ điều kiện xem xét chuyển quyền sở hữu (theo quy trình, pháp lý)',
  NOT_APPLICABLE: 'Không áp dụng',
}

export const SIGNATURE_SET_STATUSES: Record<string, { label: string; tone: Tone }> = {
  UPLOADING: { label: 'Đang tải các trang', tone: 'info' },
  FINALIZED: { label: 'Đã chốt', tone: 'ok' },
  SUPERSEDED: { label: 'Bị thay (lịch sử)', tone: 'neutral' },
}

export const COLLECTION_STATUSES: Record<string, { label: string; tone: Tone }> = {
  SALES_CONTACT_REQUIRED: { label: 'Cần liên hệ khách', tone: 'danger' },
  CONTACTED: { label: 'Đã liên hệ', tone: 'info' },
  NEGOTIATION_IN_PROGRESS: { label: 'Đang thương lượng', tone: 'info' },
  AGREEMENT_RECORDED: { label: 'Khách đã hẹn trả', tone: 'info' },
  ESCALATED_TO_MANAGER: { label: 'Chuyển quản lý', tone: 'warn' },
  LEGAL_REVIEW_REQUIRED: { label: 'Chờ xem xét pháp lý', tone: 'warn' },
  RESOLVED: { label: 'Đã đóng hồ sơ', tone: 'neutral' },
}

/** Loại ghi nhận khi theo dõi công nợ */
export const COLLECTION_ACTIVITY_KINDS: Record<string, string> = {
  OPENED: 'Mở hồ sơ',
  CONTACT: 'Liên hệ',
  NEGOTIATION: 'Thương lượng',
  AGREEMENT: 'Khách hẹn trả',
  NOTE: 'Ghi chú',
  ESCALATE: 'Chuyển quản lý',
  LEGAL_REVIEW: 'Chuyển xem xét pháp lý',
  RESOLVE: 'Đóng hồ sơ',
  PAID: 'Khách đã trả, tự đóng',
}

/** Loại ghi nhận nhân viên tự ghi được */
export const COLLECTION_RECORDABLE_KINDS = ['CONTACT', 'NEGOTIATION', 'AGREEMENT', 'NOTE'] as const

export const COLLECTION_CHANNELS: Record<string, string> = {
  PHONE: 'Điện thoại',
  VISIT: 'Tới nhà',
  ZALO: 'Zalo',
  EMAIL: 'Email',
  SMS: 'SMS',
  OTHER: 'Cách khác',
}

export const SIGNED_PAGES_MAX = 50
export const SIGNATURE_NOTE_MAX = 500
export const ACCEPTANCE_REASON_MAX = 2000
export const ACCEPTANCE_EVIDENCE_MAX = 10
export const COLLECTION_SUMMARY_MAX = 2000
export const COLLECTION_REASON_MAX = 1000
export const COLLECTION_EVIDENCE_MAX = 10
/** Khoảng tối đa của báo cáo tài chính */
export const FINANCE_PERIOD_MAX_DAYS = 366
/** Hỏi lại trạng thái khi khách đang quét mã */
export const INSTALLMENT_ONLINE_POLL_MS = 4_000
/** Hỏi lại khi chờ quản lý xác nhận tiền mặt */
export const INSTALLMENT_CASH_POLL_MS = 60_000
