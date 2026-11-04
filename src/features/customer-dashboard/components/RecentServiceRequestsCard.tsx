import { Badge, type Tone } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
import { SERVICE_REQUEST_KINDS, SERVICE_REQUEST_STATUSES } from '@/common/afterSales'
import { ROUTES, withId } from '@/routes/paths'
import type { ServiceRequestSummary } from '@/types/res/customerAfterSalesRes'

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

export function RecentServiceRequestsCard({ requests }: { requests: ServiceRequestSummary[] }) {
  return (
    <Panel>
      <PanelHeader
        className="items-start"
        title="Bảo hành, sửa chữa"
        description={requests.length > 0 ? `${requests.length} yêu cầu đã gửi` : undefined}
        action={
          <ButtonLink to={ROUTES.customer.afterSales} size="sm" variant="info" icon="list">
            Tất cả yêu cầu bảo hành
          </ButtonLink>
        }
      />
      {requests.length === 0 ? (
        <p className="text-body text-fg-2">Chưa có yêu cầu nào.</p>
      ) : (
        <ul className="divide-y divide-line">
          {requests.slice(0, 5).map((item) => {
            const kindLabel = SERVICE_REQUEST_KINDS[item.kind] || item.kind
            const statusLabel = SERVICE_REQUEST_STATUSES[item.status] || item.status
            const tone = getRequestTone(item.status)

            return (
              <ListRow key={item.requestId} className="flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-fg-1">{item.requestNumber}</span>
                    <span className="text-meta text-fg-2">
                      {kindLabel}, {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-body text-fg-2">{item.description}</p>
                  <Badge tone={tone}>{statusLabel}</Badge>
                </div>
                <ButtonLink
                  to={withId(ROUTES.customer.afterSalesRequest, item.requestId)}
                  size="sm"
                  variant="info"
                  icon="visibility"
                  className="shrink-0"
                >
                  Xem
                </ButtonLink>
              </ListRow>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
