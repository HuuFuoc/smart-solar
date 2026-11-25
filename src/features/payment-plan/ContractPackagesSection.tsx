import { useLocation } from 'react-router'
import { PACKAGE_TAX_NOTE } from '@/common/servicePackages'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { KeyValueList } from '@/components/common/ui/lists'
import { subscriptionStatusMeta } from '@/features/after-sales/afterSalesDisplay'
import {
  benefitFacts,
  bundledKindLabel,
  bundledStatusMeta,
  formatUnitPrice,
} from '@/features/after-sales/servicePackageDisplay'
import {
  bundledReasonText,
  commitmentPhase,
  contractPackageBreakdown,
  provisionedSubscription,
} from '@/features/payment-plan/bundledContractRules'
import { formatVnd } from '@/features/payment-plan/paymentPlanDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useSubscriptionsQuery } from '@/hooks/useCustomerAfterSales'
import { ROUTES } from '@/routes/paths'
import type { SubscriptionView } from '@/types/res/customerAfterSalesRes'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { ContractServicePackageView } from '@/types/res/paymentPlanRes'

// Gói dịch vụ đi kèm hợp đồng lắp đặt (backend 763cb0b), nằm trong khối báo giá đã chụp của hợp đồng. Mỗi gói là bản chụp trong
// hợp đồng (giá, số tấm, phần của từng đợt), không phải giá danh mục hiện tại, và được trả trong chính hai đợt 30/70. Trạng thái của
// gói trong hợp đồng không phải hiệu lực: chỉ gói đã tạo (PROVISIONED) có trạng thái hiệu lực riêng. Hợp đồng không có gói: không vẽ

type Viewer = 'staff' | 'customer'

function phaseNote(p: ContractServicePackageView, viewer: Viewer, subscription: SubscriptionView | null) {
  switch (commitmentPhase(p.status)) {
    case 'committed':
      return 'Gói thuộc hợp đồng, chưa có hiệu lực. Gói được tạo khi hợp đồng đã thanh toán đủ hai đợt, công trình đã bàn giao và số tấm pin lắp đặt khớp hợp đồng.'
    case 'provisioned':
      if (viewer === 'customer' && subscription)
        return `Đã tạo gói dịch vụ. Trạng thái của gói: ${subscriptionStatusMeta(subscription.status).label.toLowerCase()}.`
      return 'Đã tạo gói dịch vụ; gói có hiệu lực theo trạng thái và thời hạn của chính gói đó.'
    case 'reconciliation':
      return viewer === 'customer'
        ? 'Số tấm pin đã lắp cần Smart Solar kiểm tra lại. Gói chưa có hiệu lực cho tới khi đối soát xong.'
        : 'Số tấm pin đã lắp khác số trong hợp đồng. Sửa sổ thiết bị đã lắp của công trình rồi đối soát lại; chưa cấp quyền lợi và không đổi số tiền nào.'
    case 'discarded':
      return 'Hợp đồng đã huỷ trước khi thanh toán đợt 1 nên gói không còn hiệu lực.'
    default:
      return null
  }
}

function CommitmentItem({
  p,
  viewer,
  subscriptions,
  reconcileHref,
}: {
  p: ContractServicePackageView
  viewer: Viewer
  subscriptions: SubscriptionView[] | undefined
  reconcileHref: string | undefined
}) {
  const status = bundledStatusMeta(p.status, viewer)
  const subscription = p.status === 'PROVISIONED' ? provisionedSubscription(p, subscriptions) : null
  const note = phaseNote(p, viewer, subscription)
  const reason = p.status === 'RECONCILIATION_REQUIRED' || p.status === 'DISCARDED' ? p.statusReason : null
  // Nhân viên đọc được câu gốc khi chưa có câu tiếng Việt; khách chỉ thấy câu đã dịch
  const reasonText = bundledReasonText(reason) ?? (viewer === 'staff' ? reason : null)
  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <h4 className="text-body font-semibold text-fg">{p.packageName}</h4>
          <p className="text-meta text-fg-2">{bundledKindLabel(p.kind)}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <KeyValueList
        columns={2}
        items={[
          { k: 'Đơn giá', v: <span className="tnum">{formatUnitPrice(p.unitPrice, p.pricingUnit)}</span> },
          { k: 'Số tấm pin', v: <span className="tnum">{p.quantity.toLocaleString('vi-VN')} tấm</span> },
          { k: 'Thành tiền', v: <span className="tnum font-semibold">{formatVnd(p.totalAmount)}</span> },
          ...benefitFacts(p),
          { k: 'Trong thanh toán đợt 1', v: <span className="tnum">{formatVnd(p.depositAllocation)}</span> },
          { k: 'Trong thanh toán đợt 2', v: <span className="tnum">{formatVnd(p.balanceAllocation)}</span> },
        ]}
      />
      {note && <p className="text-meta text-fg-2">{note}</p>}
      {reasonText && <p className="text-meta text-fg">{reasonText}</p>}
      {p.statusChangedAt && <p className="tnum text-meta text-fg-3">Cập nhật {formatMoment(p.statusChangedAt)}</p>}
      {viewer === 'staff' && p.status === 'RECONCILIATION_REQUIRED' && reconcileHref && (
        <ButtonLink to={reconcileHref} size="sm" variant="info" icon="fact_check">
          Mở đối soát gói
        </ButtonLink>
      )}
      {viewer === 'customer' && subscription && (
        <ButtonLink to={ROUTES.customer.packages} size="sm" variant="info" icon="visibility">
          Xem gói dịch vụ
        </ButtonLink>
      )}
    </li>
  )
}

/** Trang quản lý gói đi kèm của cổng đang xem; chỉ quản lý và quản trị đối soát được */
function reconcilePageOf(pathname: string) {
  if (pathname.startsWith(`${ROUTES.manage.home}/`)) return ROUTES.manage.bundledPackages
  if (pathname.startsWith(`${ROUTES.admin.home}/`)) return ROUTES.admin.bundledPackages
  return undefined
}

/** `variant="card"`: trang hợp đồng phía khách (đọc thêm gói của khách để biết gói đã tạo đang ở trạng thái nào) */
export function ContractPackagesSection({
  contract: c,
  variant = 'plain',
}: {
  contract: ContractView
  variant?: 'plain' | 'card'
}) {
  const viewer: Viewer = variant === 'card' ? 'customer' : 'staff'
  const breakdown = contractPackageBreakdown(c)
  const provisioned = breakdown?.items.some((p) => p.status === 'PROVISIONED') ?? false
  // Chỉ khách đọc được danh sách gói của mình; nhân viên không gọi
  const subscriptions = useSubscriptionsQuery({ enabled: viewer === 'customer' && provisioned })
  const { pathname } = useLocation()
  if (!breakdown || breakdown.items.length === 0) return null
  return (
    <section aria-labelledby={`${c.contractId}-packages`} className="space-y-2">
      <h3 id={`${c.contractId}-packages`} className="text-body font-semibold text-fg">
        Gói dịch vụ đi kèm hợp đồng
      </h3>
      <p className="text-meta text-fg-2">
        Gói dịch vụ được thanh toán trong chính hai đợt 30% và 70% của hợp đồng, không có khoản thu riêng.{' '}
        {PACKAGE_TAX_NOTE}
      </p>
      <ul className="divide-y divide-line border-y border-line">
        {breakdown.items.map((p) => (
          <CommitmentItem
            key={p.commitmentId}
            p={p}
            viewer={viewer}
            subscriptions={subscriptions.data}
            reconcileHref={viewer === 'staff' ? reconcilePageOf(pathname) : undefined}
          />
        ))}
      </ul>
    </section>
  )
}
