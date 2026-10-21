import type { Tone } from '@/components/common/ui/badge'

// Enum của gói dịch vụ sau lắp đặt (Modules.AfterSales) và lần thanh toán PayOS (Modules.Payments) phía khách hàng

/** ServicePackageKinds; màn của khách hiện chỉ bán gói thiên tai */
export const SERVICE_PACKAGE_KINDS = {
  maintenance: 'MAINTENANCE',
  disasterProtection: 'DISASTER_PROTECTION',
} as const

/** Tên loại gói trên màn quản trị */
export const SERVICE_PACKAGE_KIND_LABELS: Record<string, string> = {
  DISASTER_PROTECTION: 'Bảo vệ thiên tai',
  MAINTENANCE: 'Bảo trì định kỳ',
}

/** Gói đang bán (isActive) hay đã ngừng bán: ngừng bán thì khách không mua mới được, gói đã mua không đổi */
export const PACKAGE_SALE_STATUSES = {
  active: { label: 'Đang bán', tone: 'ok' },
  inactive: { label: 'Ngừng bán', tone: 'neutral' },
} as const satisfies Record<string, { label: string; tone: Tone }>

/** DisasterTypes: loại thiên tai một gói bảo vệ */
export const DISASTER_TYPES: Record<string, string> = {
  STORM: 'Bão',
  FLOOD: 'Lũ lụt',
  LIGHTNING: 'Sét',
}

// Đỏ chỉ cho việc khách phải làm (thanh toán đơn đang chờ). Đã trả tiền nhưng chưa bắt đầu kỳ hoặc chờ duyệt huỷ là info
export const SUBSCRIPTION_STATUSES: Record<string, { label: string; tone: Tone }> = {
  AWAITING_PAYMENT: { label: 'Chờ thanh toán', tone: 'danger' },
  CHECKOUT_EXPIRED: { label: 'Hết hạn thanh toán', tone: 'neutral' },
  PAID: { label: 'Đã thanh toán, chờ bắt đầu', tone: 'info' },
  ACTIVE: { label: 'Đang hiệu lực', tone: 'ok' },
  EXPIRED: { label: 'Đã hết hạn', tone: 'neutral' },
  CANCELLATION_REQUESTED: { label: 'Chờ duyệt huỷ', tone: 'info' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

/** Trạng thái huỷ được trên mạng: chưa trả tiền thì huỷ ngay, đã trả tiền thì gửi yêu cầu huỷ cho quản lý */
export const SUBSCRIPTION_CANCEL_MODES: Record<string, 'unpaid' | 'paid'> = {
  AWAITING_PAYMENT: 'unpaid',
  CHECKOUT_EXPIRED: 'unpaid',
  PAID: 'paid',
}

/** PaymentStatuses của một link PayOS */
export const PAYMENT_ATTEMPT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: 'Chờ thanh toán', tone: 'danger' },
  PROCESSING: { label: 'PayOS đang xử lý', tone: 'info' },
  PAID: { label: 'PayOS đã xác nhận nhận tiền', tone: 'ok' },
  CANCELLED: { label: 'Link đã huỷ', tone: 'neutral' },
  EXPIRED: { label: 'Link đã hết hạn', tone: 'neutral' },
  FAILED: { label: 'Không tạo được link', tone: 'neutral' },
  REVIEW_REQUIRED: { label: 'Chờ Smart Solar đối soát', tone: 'warn' },
  REFUND_REQUIRED: { label: 'Chờ Smart Solar hoàn tiền', tone: 'warn' },
}

/** Link còn trả tiền được (PaymentStatuses.Payable); backend chỉ đối soát với PayOS khi link ở các trạng thái này */
export const PAYABLE_ATTEMPT_STATUSES: readonly string[] = ['PENDING', 'PROCESSING']

/** Trạng thái hợp đồng mua gói được: PAID mua riêng gói, SIGNED thì link thanh toán gồm cả tiền hợp đồng */
export const PURCHASABLE_CONTRACT_STATUSES = {
  paid: 'PAID',
  signed: 'SIGNED',
} as const
