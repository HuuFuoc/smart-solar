import { useState } from 'react'
import { SERVICE_PACKAGE_KINDS } from '@/common/afterSales'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { CancelSubscriptionDialog } from '@/features/after-sales/CancelSubscriptionDialog'
import { DisasterPackageList } from '@/features/after-sales/DisasterPackageList'
import { PaymentDialog } from '@/features/after-sales/PaymentDialog'
import { PurchaseDialog } from '@/features/after-sales/PurchaseDialog'
import { SubscriptionList } from '@/features/after-sales/SubscriptionList'
import { usePackagesQuery, useSubscriptionsQuery } from '@/hooks/useCustomerAfterSales'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import type { PackageView, SubscriptionView } from '@/types/res/customerAfterSalesRes'

// Gói bảo vệ thiên tai của khách: gói đã mua (thanh toán, huỷ trước khi hiệu lực) và gói đang bán (mua cho một hợp đồng)
// Gói bảo trì cùng API nhưng chưa bán trên màn này
const KIND = SERVICE_PACKAGE_KINDS.disasterProtection

export function CustomerPackagesPage() {
  const packages = usePackagesQuery(KIND)
  const subscriptions = useSubscriptionsQuery()
  // Chỉ để in số hợp đồng cạnh gói đã mua
  const contracts = useMyContractsQuery()
  const [buying, setBuying] = useState<PackageView | null>(null)
  const [payingAttemptId, setPayingAttemptId] = useState<string | null>(null)
  // Giữ bản lúc bấm: danh sách tải lại ngay khi huỷ xong, trước khi hộp thoại kịp đóng
  const [cancelling, setCancelling] = useState<SubscriptionView | null>(null)

  const mine = subscriptions.data?.filter((s) => s.kind === KIND) ?? []
  const contractNumbers = new Map((contracts.data ?? []).map((c) => [c.contractId, c.contractNumber]))

  return (
    <>
      <PageHeader
        title="Bảo vệ thiên tai"
        description="Gói hỗ trợ chi phí sửa chữa hệ thống khi thiên tai gây hư hỏng, theo tỷ lệ và hạn mức của từng gói."
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

        <Panel>
          <PanelHeader title="Gói đang bán" />
          <PanelBody>
            {packages.isPending ? (
              <Skeleton className="h-40" />
            ) : packages.data === undefined ? (
              <ErrorState
                title="Không tải được danh sách gói."
                message={packages.error?.message}
                onRetry={() => void packages.refetch()}
              />
            ) : packages.data.length === 0 ? (
              <EmptyState
                title="Chưa có gói bảo vệ thiên tai đang bán"
                description="Gói hiện ở đây khi Smart Solar mở bán."
              />
            ) : (
              <DisasterPackageList items={packages.data} onBuy={setBuying} />
            )}
          </PanelBody>
        </Panel>
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
