import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { SERVICE_PACKAGE_KINDS } from '@/common/afterSales'
import { Badge } from '@/components/common/ui/badge'
import { PageHeader } from '@/components/common/ui/page-header'
import { PagedList } from '@/components/common/ui/pagination'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { awaitsPayment, packageKindLabel } from '@/features/after-sales/afterSalesDisplay'
import { CancelSubscriptionDialog } from '@/features/after-sales/CancelSubscriptionDialog'
import { BOOKING_LEAD_DAYS, entitlementDeadline } from '@/features/after-sales/customerServiceRules'
import { PackageList } from '@/features/after-sales/PackageList'
import { isPerPanelPackage } from '@/features/after-sales/panelCoverageRules'
import { PanelPurchaseDialog } from '@/features/after-sales/PanelPurchaseDialog'
import { PaymentDialog } from '@/features/after-sales/PaymentDialog'
import { PreferredTimeDialog } from '@/features/after-sales/PreferredTimeDialog'
import { PurchaseDialog } from '@/features/after-sales/PurchaseDialog'
import { RenewalDialog } from '@/features/after-sales/RenewalDialog'
import { SubscriptionList } from '@/features/after-sales/SubscriptionList'
import { PAYOS_RETURN_PARAM } from '@/features/payments/payosReturn'
import { useCheckoutRedirect } from '@/hooks/useCheckoutRedirect'
import { usePackagesQuery, useSubscriptionsQuery } from '@/hooks/useCustomerAfterSales'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { useBookMaintenanceMutation } from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import type {
  EntitlementView,
  PackageView,
  PaymentAttemptView,
  ServicePackageKind,
  SubscriptionView,
} from '@/types/res/customerAfterSalesRes'

/** Mở lại hộp thoại thanh toán của một link, khi PayOS chuyển khách về trang này */
const PAYMENT_PARAM = 'thanh-toan'

// Gói dịch vụ của khách: gói đã mua (thanh toán, huỷ trước khi hiệu lực, gia hạn kỳ theo tấm pin) và gói đang bán của hai loại,
// bảo vệ thiên tai và bảo trì định kỳ (mua cho một hợp đồng), đặt lịch từng lượt bảo trì của gói đang hiệu lực. Gói theo tấm pin mua
// cho các tấm đã chọn sau bàn giao; gói theo hệ thống mua như trước. Cả hai trả 100% trước, không gộp vào khoản 30/70

function OnSale({ kind, onBuy }: { kind: ServicePackageKind; onBuy: (pkg: PackageView) => void }) {
  const packages = usePackagesQuery(kind)
  const label = packageKindLabel(kind)
  if (packages.isPending) return <Skeleton className="h-44" />
  if (packages.data === undefined)
    return (
      <ErrorState
        title={`Không tải được gói ${label.toLowerCase()}.`}
        message={packages.error?.message}
        onRetry={() => void packages.refetch()}
      />
    )
  // Loại gói chưa có gói nào đang bán thì không chiếm chỗ
  if (packages.data.length === 0) return null
  return <PackageList items={packages.data} onBuy={onBuy} />
}

export function CustomerPackagesPage() {
  const subscriptions = useSubscriptionsQuery()
  // Chỉ để in số hợp đồng cạnh gói đã mua
  const contracts = useMyContractsQuery()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [buying, setBuying] = useState<PackageView | null>(null)
  const redirect = useCheckoutRedirect()
  // PayOS chuyển về kèm ?thanh-toan= thì mở lại đúng link đó; trạng thái vẫn hỏi hệ thống
  const [payingAttemptId, setPayingAttemptId] = useState<string | null>(() => params.get(PAYMENT_PARAM))
  const [booking, setBooking] = useState<{ entitlement: EntitlementView; subscription: SubscriptionView } | null>(null)
  const book = useBookMaintenanceMutation()
  // Giữ bản lúc bấm: danh sách tải lại ngay khi huỷ xong, trước khi hộp thoại kịp đóng
  const [cancelling, setCancelling] = useState<SubscriptionView | null>(null)
  const [renewing, setRenewing] = useState<SubscriptionView | null>(null)

  // Sang ngay trang PayOS trong tab này; PayOS chưa trả link (hoặc trả tiền mặt) thì mở hộp thanh toán để khách kiểm tra lại
  function payNow(attempt: PaymentAttemptView) {
    const back = `${ROUTES.customer.packages}?${PAYMENT_PARAM}=${attempt.paymentAttemptId}`
    if (!redirect.go(attempt, back)) setPayingAttemptId(attempt.paymentAttemptId)
  }

  const mine = subscriptions.data ?? []
  const toPay = mine.filter(awaitsPayment).length
  const contractNumbers = new Map((contracts.data ?? []).map((c) => [c.contractId, c.contractNumber]))

  return (
    <>
      <PageHeader
        title="Gói dịch vụ"
        description={toPay > 0 ? <Badge tone="danger">{toPay} gói chờ bạn thanh toán</Badge> : undefined}
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
            <section aria-labelledby="my-packages" className="rounded-container border border-line bg-panel p-4">
              <h2 id="my-packages" className="mb-3 text-title font-semibold text-fg">
                Gói của bạn
              </h2>
              <PagedList items={mine} noun="gói" keepScroll>
                {(page) => (
                  <SubscriptionList
                    items={page}
                    contractNumbers={contractNumbers}
                    onPay={setPayingAttemptId}
                    onCancel={setCancelling}
                    onBook={(entitlement, subscription) => setBooking({ entitlement, subscription })}
                    onRenew={setRenewing}
                  />
                )}
              </PagedList>
            </section>
          )
        )}

        <OnSale kind={SERVICE_PACKAGE_KINDS.disasterProtection} onBuy={setBuying} />
        <OnSale kind={SERVICE_PACKAGE_KINDS.maintenance} onBuy={setBuying} />
      </div>

      <PurchaseDialog
        pkg={buying && !isPerPanelPackage(buying) ? buying : null}
        onClose={() => setBuying(null)}
        onPurchased={(attempt) => {
          setBuying(null)
          payNow(attempt)
        }}
      />
      <PanelPurchaseDialog
        pkg={buying && isPerPanelPackage(buying) ? buying : null}
        onClose={() => setBuying(null)}
        onPurchased={(attempt) => {
          setBuying(null)
          payNow(attempt)
        }}
      />
      <RenewalDialog
        subscription={renewing}
        onClose={() => setRenewing(null)}
        onPurchased={(attempt) => {
          setRenewing(null)
          payNow(attempt)
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
