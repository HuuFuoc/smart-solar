import { useState } from 'react'
import { SERVICE_PACKAGE_KINDS } from '@/common/afterSales'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { packageKindLabel } from '@/features/after-sales/afterSalesDisplay'
import { CancelSubscriptionDialog } from '@/features/after-sales/CancelSubscriptionDialog'
import { PackageList } from '@/features/after-sales/PackageList'
import { PaymentDialog } from '@/features/after-sales/PaymentDialog'
import { PurchaseDialog } from '@/features/after-sales/PurchaseDialog'
import { SubscriptionList } from '@/features/after-sales/SubscriptionList'
import { usePackagesQuery, useSubscriptionsQuery } from '@/hooks/useCustomerAfterSales'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import type { PackageView, ServicePackageKind, SubscriptionView } from '@/types/res/customerAfterSalesRes'

// Gói dịch vụ của khách: gói đã mua (thanh toán, huỷ trước khi hiệu lực) và gói đang bán của hai loại, bảo vệ thiên tai
// và bảo trì định kỳ (mua cho một hợp đồng). Đặt lịch các lượt bảo trì đã mua chưa có trên màn này

const KIND_DESCRIPTIONS: Record<string, string> = {
  [SERVICE_PACKAGE_KINDS.disasterProtection]: 'Hỗ trợ chi phí sửa chữa khi thiên tai làm hư hỏng hệ thống.',
  [SERVICE_PACKAGE_KINDS.maintenance]: 'Kỹ thuật viên tới kiểm tra hệ thống theo lịch của gói.',
}

function OnSale({ kind, onBuy }: { kind: ServicePackageKind; onBuy: (pkg: PackageView) => void }) {
  const packages = usePackagesQuery(kind)
  const label = packageKindLabel(kind)
  return (
    <Panel>
      <PanelHeader title={label} description={KIND_DESCRIPTIONS[kind]} />
      <PanelBody>
        {packages.isPending ? (
          <Skeleton className="h-40" />
        ) : packages.data === undefined ? (
          <ErrorState
            title={`Không tải được gói ${label.toLowerCase()}.`}
            message={packages.error?.message}
            onRetry={() => void packages.refetch()}
          />
        ) : packages.data.length === 0 ? (
          <EmptyState
            title={`Chưa có gói ${label.toLowerCase()} đang bán`}
            description="Gói hiện ở đây khi Smart Solar mở bán."
          />
        ) : (
          <PackageList items={packages.data} onBuy={onBuy} />
        )}
      </PanelBody>
    </Panel>
  )
}

export function CustomerPackagesPage() {
  const subscriptions = useSubscriptionsQuery()
  // Chỉ để in số hợp đồng cạnh gói đã mua
  const contracts = useMyContractsQuery()
  const [buying, setBuying] = useState<PackageView | null>(null)
  const [payingAttemptId, setPayingAttemptId] = useState<string | null>(null)
  // Giữ bản lúc bấm: danh sách tải lại ngay khi huỷ xong, trước khi hộp thoại kịp đóng
  const [cancelling, setCancelling] = useState<SubscriptionView | null>(null)

  const mine = subscriptions.data ?? []
  const contractNumbers = new Map((contracts.data ?? []).map((c) => [c.contractId, c.contractNumber]))

  return (
    <>
      <PageHeader
        title="Gói dịch vụ"
        description="Gói bảo vệ thiên tai và bảo trì định kỳ cho hệ thống đã lắp. Mỗi gói mua cho một hợp đồng lắp đặt."
      />

      <div className="space-y-4">
        {subscriptions.isPending ? (
          <Skeleton className="h-32" />
        ) : subscriptions.data === undefined ? (
          <ErrorState
            title="Không tải được gói bạn đã mua."
            message={subscriptions.error?.message}
            onRetry={() => void subscriptions.refetch()}
          />
        ) : (
          mine.length > 0 && (
            <Panel>
              <PanelHeader title="Gói của bạn" />
              <PanelBody>
                <SubscriptionList
                  items={mine}
                  contractNumbers={contractNumbers}
                  onPay={setPayingAttemptId}
                  onCancel={setCancelling}
                />
              </PanelBody>
            </Panel>
          )
        )}

        <OnSale kind={SERVICE_PACKAGE_KINDS.disasterProtection} onBuy={setBuying} />
        <OnSale kind={SERVICE_PACKAGE_KINDS.maintenance} onBuy={setBuying} />
      </div>

      <PurchaseDialog
        pkg={buying}
        onClose={() => setBuying(null)}
        onPurchased={(attemptId) => {
          setBuying(null)
          setPayingAttemptId(attemptId)
        }}
      />
      <PaymentDialog attemptId={payingAttemptId} onClose={() => setPayingAttemptId(null)} />
      <CancelSubscriptionDialog subscription={cancelling} onClose={() => setCancelling(null)} />
    </>
  )
}
