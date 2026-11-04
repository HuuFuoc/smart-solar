import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { SERVICE_PACKAGE_KINDS } from '@/common/afterSales'
import { Badge } from '@/components/common/ui/badge'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { awaitsPayment, packageKindLabel } from '@/features/after-sales/afterSalesDisplay'
import { CancelSubscriptionDialog } from '@/features/after-sales/CancelSubscriptionDialog'
import { BOOKING_LEAD_DAYS, entitlementDeadline } from '@/features/after-sales/customerServiceRules'
import { PackageList } from '@/features/after-sales/PackageList'
import { PaymentDialog } from '@/features/after-sales/PaymentDialog'
import { PreferredTimeDialog } from '@/features/after-sales/PreferredTimeDialog'
import { PurchaseDialog } from '@/features/after-sales/PurchaseDialog'
import { SubscriptionList } from '@/features/after-sales/SubscriptionList'
import { PAYOS_RETURN_PARAM } from '@/features/payments/payosReturn'
import { usePackagesQuery, useSubscriptionsQuery } from '@/hooks/useCustomerAfterSales'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { useBookMaintenanceMutation } from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import type {
  EntitlementView,
  PackageView,
  ServicePackageKind,
  SubscriptionView,
} from '@/types/res/customerAfterSalesRes'

/** Mở lại hộp thoại thanh toán của một link, khi PayOS chuyển khách về trang này */
const PAYMENT_PARAM = 'thanh-toan'

// Gói dịch vụ của khách: gói đã mua (thanh toán, huỷ trước khi hiệu lực) và gói đang bán của hai loại, bảo vệ thiên tai
// và bảo trì định kỳ (mua cho một hợp đồng), đặt lịch từng lượt bảo trì của gói đang hiệu lực

function OnSale({ kind, onBuy }: { kind: ServicePackageKind; onBuy: (pkg: PackageView) => void }) {
  const packages = usePackagesQuery(kind)
  const label = packageKindLabel(kind)
  return (
    <Panel>
      <PanelHeader title={label} />
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
          <EmptyState title={`Chưa có gói ${label.toLowerCase()} đang bán`} />
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
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [buying, setBuying] = useState<PackageView | null>(null)
  // PayOS chuyển về kèm ?thanh-toan= thì mở lại đúng link đó; trạng thái vẫn hỏi hệ thống
  const [payingAttemptId, setPayingAttemptId] = useState<string | null>(() => params.get(PAYMENT_PARAM))
  const [booking, setBooking] = useState<{ entitlement: EntitlementView; subscription: SubscriptionView } | null>(null)
  const book = useBookMaintenanceMutation()
  // Giữ bản lúc bấm: danh sách tải lại ngay khi huỷ xong, trước khi hộp thoại kịp đóng
  const [cancelling, setCancelling] = useState<SubscriptionView | null>(null)

  const mine = subscriptions.data ?? []
  const toPay = mine.filter(awaitsPayment).length
  const contractNumbers = new Map((contracts.data ?? []).map((c) => [c.contractId, c.contractNumber]))

  return (
    <>
      <PageHeader
        title="Gói dịch vụ"
        description={
          toPay > 0 ? (
            <Badge tone="danger" icon="payments">
              {toPay} gói chờ bạn thanh toán
            </Badge>
          ) : undefined
        }
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
                  onBook={(entitlement, subscription) => setBooking({ entitlement, subscription })}
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
      <PaymentDialog
        attemptId={payingAttemptId}
        returnPath={payingAttemptId ? `${ROUTES.customer.packages}?${PAYMENT_PARAM}=${payingAttemptId}` : undefined}
        onClose={() => {
          setPayingAttemptId(null)
          if (params.has(PAYMENT_PARAM) || params.has(PAYOS_RETURN_PARAM)) setParams({}, { replace: true })
        }}
      />
      <PreferredTimeDialog
        open={booking !== null}
        title="Đặt lịch bảo trì"
        icon="event"
        submitLabel="Đặt lịch"
        withNote
        limits={{
          leadDays: BOOKING_LEAD_DAYS,
          periodStartsAt: booking?.entitlement.periodStartsAt ?? null,
          latestAt: booking ? entitlementDeadline(booking.entitlement, booking.subscription) : null,
        }}
        onClose={() => setBooking(null)}
        onSubmit={async (preferredStartsAt, note) => {
          if (!booking) return
          const request = await book.mutateAsync({
            entitlementId: booking.entitlement.entitlementId,
            body: { preferredStartsAt, note },
          })
          toast.success('Đã gửi lịch bảo trì. Smart Solar sẽ xếp kỹ thuật viên và báo lịch hẹn.')
          setBooking(null)
          void navigate(withId(ROUTES.customer.afterSalesRequest, request.requestId))
        }}
      >
        {booking && (
          <p>
            Lượt bảo trì của {booking.subscription.packageName}. Chọn giờ bạn muốn kỹ thuật viên tới; lượt chỉ được tính
            khi bảo trì xong.
          </p>
        )}
      </PreferredTimeDialog>
      <CancelSubscriptionDialog subscription={cancelling} onClose={() => setCancelling(null)} />
    </>
  )
}
