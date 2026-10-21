import {
  DISASTER_TYPES,
  PAYABLE_ATTEMPT_STATUSES,
  PAYMENT_ATTEMPT_STATUSES,
  PURCHASABLE_CONTRACT_STATUSES,
  SUBSCRIPTION_CANCEL_MODES,
  SUBSCRIPTION_STATUSES,
} from '@/common/afterSales'
import type { Tone } from '@/components/common/ui/badge'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'

// Nhãn và điều kiện của gói dịch vụ phía khách. Điều kiện bám ServicePackageHandlers của backend; backend vẫn kiểm tra lại

/** Nhãn + màu trạng thái gói đã mua. Mã lạ in nguyên mã, màu xám */
export function subscriptionStatusMeta(status: string): { label: string; tone: Tone } {
  return SUBSCRIPTION_STATUSES[status] ?? { label: status, tone: 'neutral' }
}

export function paymentStatusMeta(status: string): { label: string; tone: Tone } {
  return PAYMENT_ATTEMPT_STATUSES[status] ?? { label: status, tone: 'neutral' }
}

export function isPayableAttempt(status: string | null | undefined) {
  return status != null && PAYABLE_ATTEMPT_STATUSES.includes(status)
}

/** "Bão, Lũ lụt, Sét"; mã lạ in nguyên mã */
export function disasterTypesLabel(types: string[]) {
  return types.length > 0 ? types.map((t) => DISASTER_TYPES[t] ?? t).join(', ') : '—'
}

/** "12 tháng", "2 năm" */
export function formatDurationMonths(months: number) {
  return months % 12 === 0 ? `${months / 12} năm` : `${months} tháng`
}

const percent = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** "70%", "72,5%" */
export function formatPercent(value: number | null | undefined) {
  return value == null ? '—' : `${percent.format(value)}%`
}

/** unpaid: huỷ ngay; paid: gửi yêu cầu huỷ cho quản lý; null: không huỷ được trên mạng (đang hiệu lực, đã xong) */
export function cancelMode(status: string) {
  return SUBSCRIPTION_CANCEL_MODES[status] ?? null
}

// Việc khách cần làm lên đầu, rồi gói đang có hiệu lực, đã xong xuống cuối
const RANK: Record<string, number> = {
  AWAITING_PAYMENT: 0,
  ACTIVE: 1,
  PAID: 2,
  CANCELLATION_REQUESTED: 3,
  CHECKOUT_EXPIRED: 4,
  EXPIRED: 5,
  CANCELLED: 6,
}

export function bySubscriptionRank<T extends { status: string }>(a: T, b: T) {
  return (RANK[a.status] ?? 7) - (RANK[b.status] ?? 7)
}

export type PurchasableContract = {
  contract: ContractView
  /** SIGNED (chưa thanh toán): link PayOS gồm cả tiền hợp đồng, backend bắt buộc includeContract = true */
  includeContract: boolean
}

/**
 * Hợp đồng mua gói được: PAID (mua riêng gói) hoặc SIGNED (trả cùng hợp đồng), trừ hợp đồng có công trình đã huỷ.
 * `projects` có thể chưa tải xong; khi đó không loại hợp đồng nào, backend sẽ từ chối nếu công trình đã huỷ
 */
export function purchasableContracts(
  contracts: ContractView[],
  projects: Pick<InstallationCustomerView, 'contractId' | 'status'>[] | undefined,
): PurchasableContract[] {
  const cancelled = new Set((projects ?? []).filter((p) => p.status === 'CANCELLED').map((p) => p.contractId))
  return contracts
    .filter(
      (c) =>
        (c.status === PURCHASABLE_CONTRACT_STATUSES.paid || c.status === PURCHASABLE_CONTRACT_STATUSES.signed) &&
        !cancelled.has(c.contractId),
    )
    .map((contract) => ({ contract, includeContract: contract.status === PURCHASABLE_CONTRACT_STATUSES.signed }))
}
