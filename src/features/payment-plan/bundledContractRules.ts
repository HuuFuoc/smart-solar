import type { SubscriptionView } from '@/types/res/customerAfterSalesRes'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { ContractPaymentPlanView, ContractServicePackageView } from '@/types/res/paymentPlanRes'

// Gói đi kèm hợp đồng lắp đặt (backend 763cb0b): tổng hợp đồng = chi phí lắp đặt + gói dịch vụ, chia 30/70 trên chính tổng đó.
// Không có khoản thu riêng cho gói đi kèm; số phải trả của một khoản luôn là `amount` backend trả. Phần chia của từng khoản chỉ để
// đọc. Trạng thái gói của hợp đồng không phải trạng thái hiệu lực: hiệu lực là trạng thái của kỳ gói đã tạo.
// Không import giá trị qua "@/" để chạy được bằng node --test

const KIND_ORDER = ['MAINTENANCE', 'DISASTER_PROTECTION']
const kindRank = (kind: string) => (KIND_ORDER.indexOf(kind) === -1 ? KIND_ORDER.length : KIND_ORDER.indexOf(kind))

type Breakdown = Pick<ContractView, 'totalAmount' | 'installationTotal' | 'servicePackagesTotal' | 'servicePackages'>

/**
 * Hợp đồng có gói đi kèm: hai tổng của backend, tổng giá trị và các gói (bảo trì trước). null với hợp đồng không có gói (backend
 * trả hai tổng null) và với máy chủ cũ (không có các trường này): khi đó màn hợp đồng giữ nguyên như trước
 */
export function contractPackageBreakdown(c: Breakdown) {
  if (c.installationTotal == null || c.servicePackagesTotal == null) return null
  const items = Array.isArray(c.servicePackages) ? [...c.servicePackages] : []
  return {
    installation: c.installationTotal,
    packages: c.servicePackagesTotal,
    total: c.totalAmount,
    items: items.sort((a, b) => kindRank(a.kind) - kindRank(b.kind)),
  }
}

/** Gói đi kèm theo loại, cộng từ bản chụp của hợp đồng (để in tổng từng loại, không phải số tiền mới) */
export const packagesTotalOfKind = (items: Pick<ContractServicePackageView, 'kind' | 'totalAmount'>[], kind: string) =>
  items.filter((p) => p.kind === kind).reduce((sum, p) => sum + p.totalAmount, 0)

export type AllocationRow = {
  sequence: number
  percent: number
  /** Số phải trả của khoản (đúng `amount` của khoản) */
  amount: number
  installation: number
  maintenance: number
  disaster: number
}

/**
 * Phần chia của hai khoản (Đợt 1 30%, Đợt 2 70%) cho chi phí lắp đặt và từng loại gói, theo `allocation` backend chốt lúc lập
 * hợp đồng. null khi hợp đồng không có gói (khoản không có `allocation`). Số phải trả là `amount` của khoản, không cộng thêm gì
 */
export function installmentAllocations(plan: Pick<ContractPaymentPlanView, 'installments'>): AllocationRow[] | null {
  const rows = plan.installments
    .filter((i) => i.allocation)
    .sort((a, b) => a.sequence - b.sequence)
    .map((i) => ({
      sequence: i.sequence,
      percent: i.percent,
      amount: i.amount,
      installation: i.allocation!.installation,
      maintenance: i.allocation!.maintenancePackages,
      disaster: i.allocation!.disasterPackages,
    }))
  return rows.length > 0 ? rows : null
}

export type CommitmentPhase = 'committed' | 'provisioned' | 'reconciliation' | 'discarded' | 'unknown'

export function commitmentPhase(status: string): CommitmentPhase {
  switch (status) {
    case 'COMMITTED':
      return 'committed'
    case 'PROVISIONED':
      return 'provisioned'
    case 'RECONCILIATION_REQUIRED':
      return 'reconciliation'
    case 'DISCARDED':
      return 'discarded'
    default:
      return 'unknown'
  }
}

/**
 * Gói đi kèm có đang bảo vệ không: chỉ khi đã tạo kỳ gói VÀ kỳ đó ACTIVE. COMMITTED, chờ đối soát, đã huỷ không bao giờ là đang bảo
 * vệ; đã tạo kỳ mà chưa đọc được kỳ (hoặc kỳ chưa bắt đầu) thì cũng chưa
 */
export function isCoverageActive(
  c: Pick<ContractServicePackageView, 'status' | 'subscriptionId'>,
  subscription: Pick<SubscriptionView, 'subscriptionId' | 'status'> | null | undefined,
) {
  if (c.status !== 'PROVISIONED' || !c.subscriptionId || !subscription) return false
  return subscription.subscriptionId === c.subscriptionId && subscription.status === 'ACTIVE'
}

/** Kỳ gói đã tạo từ một gói đi kèm, tìm trong danh sách gói của khách theo `contractServicePackageId` rồi theo `subscriptionId` */
export function provisionedSubscription<
  T extends Pick<SubscriptionView, 'subscriptionId' | 'contractServicePackageId'>,
>(c: Pick<ContractServicePackageView, 'commitmentId' | 'subscriptionId'>, subscriptions: T[] | undefined): T | null {
  if (!subscriptions) return null
  return (
    subscriptions.find((s) => s.contractServicePackageId === c.commitmentId) ??
    (c.subscriptionId ? subscriptions.find((s) => s.subscriptionId === c.subscriptionId) : undefined) ??
    null
  )
}

/**
 * Câu tiếng Việt cho lý do chờ đối soát / huỷ backend ghi bằng tiếng Anh (PanelCoverage.cs, PaymentPlanLedger). Không nhận ra thì
 * trả null để nơi gọi dùng câu chung (khách) hoặc câu gốc (nhân viên)
 */
export function bundledReasonText(reason: string | null | undefined): string | null {
  if (!reason) return null
  const counts = /Contracted (\d+) panel unit\(s\) but (\d+) active panel unit\(s\)/i.exec(reason)
  if (counts)
    return `Hợp đồng ghi ${counts[1]} tấm pin nhưng công trình đang ghi nhận ${counts[2]} tấm pin hoạt động. Chưa cấp quyền lợi và không đổi số tiền nào.`
  if (/not handed over yet/i.test(reason)) return 'Công trình chưa bàn giao; gói được tạo sau khi bàn giao.'
  if (/installation-wide/i.test(reason))
    return 'Công trình đang có gói cùng loại áp dụng cho toàn bộ hệ thống, nên chưa tạo được gói theo tấm pin.'
  if (/not already covered|unit\(s\) requested/i.test(reason))
    return 'Một số tấm pin đã có gói cùng loại trong cùng thời gian, nên chưa tạo được gói.'
  if (/not an active installed panel/i.test(reason)) return 'Có tấm pin không còn hoạt động trong sổ thiết bị đã lắp.'
  return null
}
