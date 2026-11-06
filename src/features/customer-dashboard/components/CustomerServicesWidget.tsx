import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge, type Tone } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { SERVICE_REQUEST_KINDS, SERVICE_REQUEST_STATUSES } from '@/common/afterSales'
import { ROUTES } from '@/routes/paths'
import type { ServiceRequestSummary, SubscriptionView } from '@/types/res/customerAfterSalesRes'

type CustomerServicesWidgetProps = {
  subscriptions: SubscriptionView[]
  serviceRequests: ServiceRequestSummary[]
  activeAssetsCount?: number
}

function getRequestTone(status: string): Tone {
  if (status === 'PENDING_CUSTOMER_ACCEPTANCE') return 'danger'
  if (status === 'COMPLETED') return 'ok'
  if (status === 'CANCELLED' || status === 'NOT_COMPLETED') return 'neutral'
  return 'info'
}

function formatDate(isoString: string) {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(isoString))
  } catch {
    return isoString
  }
}

export function CustomerServicesWidget({
  subscriptions,
  serviceRequests,
  activeAssetsCount = 0,
}: CustomerServicesWidgetProps) {
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE' || s.status === 'PAID')
  const pendingRequests = serviceRequests.filter(
    (s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && s.status !== 'CLOSED_DUPLICATE',
  )

  return (
    <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Icon name="verified_user" className="text-[18px] text-accent" />
          <h2 className="text-body font-semibold text-fg sm:text-title">Dịch vụ & Bảo hành</h2>
        </div>
        <ButtonLink
          to={ROUTES.customer.packages}
          size="sm"
          variant="ghost"
          icon="shopping_bag"
          className="text-meta text-accent-fg hover:text-accent font-medium"
        >
          Gói dịch vụ
        </ButtonLink>
      </div>

      {/* Trạng thái gói dịch vụ đang dùng */}
      {activeSubs.length > 0 ? (
        <div className="space-y-2">
          <p className="text-meta font-medium text-fg-2">Gói dịch vụ đang kích hoạt:</p>
          <ul className="space-y-2">
            {activeSubs.slice(0, 2).map((sub) => (
              <li
                key={sub.subscriptionId}
                className="flex items-center justify-between gap-2 rounded-control bg-canvas/60 p-2.5 text-meta"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-fg truncate">
                    {sub.packageName ||
                      (sub.kind === 'MAINTENANCE' ? 'Gói bảo dưỡng định kỳ SolarCare' : 'Gói bảo vệ rủi ro thiên tai')}
                  </p>
                  <p className="text-fg-3">Hết hạn: {sub.endsAt ? formatDate(sub.endsAt) : 'Chưa kích hoạt'}</p>
                </div>
                <Badge tone="ok">Đang hiệu lực</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        /* Chưa mua gói bảo hiểm */
        <div className="rounded-control bg-canvas/60 p-3 space-y-1.5 text-meta">
          <div className="flex items-center gap-1.5 font-semibold text-fg">
            <Icon name="shield" className="text-[16px] text-accent" />
            <span>Chưa đăng ký gói bảo vệ bổ sung</span>
          </div>
          <p className="text-fg-2">
            Đăng ký gói bảo vệ rủi ro thiên tai (bão, ngập lụt, sét đánh) và bảo dưỡng định kỳ trọn vòng đời.
          </p>
          <div className="pt-1">
            <ButtonLink to={ROUTES.customer.packages} size="sm" variant="soft" icon="add_moderator">
              Đăng ký gói bảo vệ
            </ButtonLink>
          </div>
        </div>
      )}

      {/* Yêu cầu sự cố / bảo trì đang xử lý */}
      {pendingRequests.length > 0 ? (
        <div className="space-y-2 pt-2 border-t border-line/60">
          <div className="flex items-center justify-between text-meta">
            <span className="font-medium text-fg-2">Sự cố đang xử lý ({pendingRequests.length}):</span>
            <ButtonLink
              to={ROUTES.customer.afterSales}
              size="sm"
              variant="ghost"
              className="text-accent-fg hover:text-accent font-medium text-[12px]"
            >
              Xem tất cả
            </ButtonLink>
          </div>
          <ul className="space-y-2">
            {pendingRequests.slice(0, 2).map((req) => {
              const kindLabel = SERVICE_REQUEST_KINDS[req.kind] || req.kind
              const statusLabel = SERVICE_REQUEST_STATUSES[req.status] || req.status
              const tone = getRequestTone(req.status)

              return (
                <li
                  key={req.requestId}
                  className="flex items-center justify-between gap-2 rounded-control bg-canvas/60 p-2.5 text-meta"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-fg truncate">
                      #{req.requestNumber} - {kindLabel}
                    </p>
                    <p className="text-fg-3 truncate">{req.description || 'Chờ kỹ thuật xử lý'}</p>
                  </div>
                  <Badge tone={tone}>{statusLabel}</Badge>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-2 border-t border-line/60 text-meta">
          <span className="text-fg-2">Hệ thống & Thiết bị vận hành:</span>
          <span className="font-semibold text-fg">
            {activeAssetsCount > 0 ? `${activeAssetsCount} thiết bị ổn định` : 'Bình thường'}
          </span>
        </div>
      )}

      {/* Footer CTA */}
      <div className="pt-1">
        <ButtonLink
          to={ROUTES.customer.afterSales}
          size="sm"
          variant="secondary"
          icon="support_agent"
          className="w-full justify-center"
        >
          Gửi yêu cầu bảo hành / hỗ trợ
        </ButtonLink>
      </div>
    </div>
  )
}
