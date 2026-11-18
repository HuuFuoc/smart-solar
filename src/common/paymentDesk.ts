import type { Tone } from '@/components/common/ui/badge'

// Bàn thu tiền và sổ tiền chưa áp (Modules.Payments: PaymentItemTypes, PaymentItemStatuses; RefundRecordStatuses)

/** Khoản của một dòng thanh toán */
export const PAYMENT_ITEM_TYPES: Record<string, string> = {
  CONTRACT: 'Hợp đồng lắp đặt',
  MAINTENANCE_PACKAGE: 'Gói bảo trì',
  DISASTER_PACKAGE: 'Gói bảo vệ thiên tai',
  REPAIR_QUOTATION: 'Báo giá sửa chữa',
  MAINTENANCE_QUOTATION: 'Báo giá bảo trì lẻ',
}

export const PAYMENT_ITEM_STATUSES: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chưa trả', tone: 'neutral' },
  SETTLED: { label: 'Đã áp', tone: 'ok' },
  REVIEW_REQUIRED: { label: 'Cần đối soát', tone: 'warn' },
}

/** Bộ lọc cách trả; giá trị rỗng là mọi cách */
export const PAYMENT_DESK_METHODS = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'ONLINE', label: 'PayOS' },
  { value: '', label: 'Mọi cách trả' },
] as const

/** Bộ lọc trạng thái lần thanh toán; giá trị rỗng là mọi trạng thái */
export const PAYMENT_DESK_STATUSES = [
  { value: 'PENDING', label: 'Chờ thu' },
  { value: 'PAID', label: 'Đã trả' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
  { value: 'REVIEW_REQUIRED', label: 'Cần đối soát' },
  { value: 'REFUND_REQUIRED', label: 'Trả trùng' },
  { value: '', label: 'Mọi trạng thái' },
] as const

/** Trạng thái của khoản tiền chưa áp. Ứng dụng không duyệt / hoàn: đây chỉ là theo dõi việc kế toán làm ngoài hệ thống */
export const UNAPPLIED_STATUSES: Record<string, { label: string; tone: Tone }> = {
  PENDING_APPROVAL: { label: 'Chờ kế toán xử lý', tone: 'warn' },
  APPROVED: { label: 'Kế toán đã duyệt', tone: 'info' },
  REJECTED: { label: 'Kế toán không duyệt', tone: 'neutral' },
  REFUNDED: { label: 'Đã trả lại khách', tone: 'neutral' },
}

export const UNAPPLIED_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING_APPROVAL', label: 'Chờ kế toán' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Không duyệt' },
  { value: 'REFUNDED', label: 'Đã trả lại' },
] as const
