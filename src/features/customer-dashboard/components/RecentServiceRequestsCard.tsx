import { Badge, type Tone } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
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
  const hasScroll = requests.length > 4

  return (
    <Panel className="flex h-full flex-col justify-between">
      <div>
        <PanelHeader
          title="Bảo hành, sửa chữa"
          description={requests.length > 0 ? `${requests.length} yêu cầu đã gửi` : undefined}
        />
        <PanelBody>
          {requests.length === 0 ? (
            <p className="py-6 text-center text-body text-fg-3">Chưa có yêu cầu nào.</p>
          ) : (
            <div className={hasScroll ? 'max-h-[520px] overflow-y-auto pr-1.5' : undefined}>
              <ul className="divide-y divide-line">
                {requests.map((item) => {
                  const kindLabel = SERVICE_REQUEST_KINDS[item.kind] || item.kind
                  const statusLabel = SERVICE_REQUEST_STATUSES[item.status] || item.status
                  const tone = getRequestTone(item.status)

                  return (
                    <li key={item.requestId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-fg-1">#{item.requestNumber}</span>
                            <span className="text-meta text-fg-3">{kindLabel}</span>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-body text-fg-2">{item.description}</p>
                        </div>
                        <Badge tone={tone} className="shrink-0 whitespace-nowrap">
                          {statusLabel}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-meta text-fg-3">
                        <span>Tạo ngày: {formatDate(item.createdAt)}</span>
                        <ButtonLink
                          to={withId(ROUTES.customer.afterSalesRequest, item.requestId)}
                          size="sm"
                          variant="info"
                          icon="visibility"
                        >
                          Xem
                        </ButtonLink>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </PanelBody>
      </div>

      <PanelFooter className="flex justify-end">
        <ButtonLink to={ROUTES.customer.afterSales} size="sm" variant="info" icon="list">
          Tất cả yêu cầu bảo hành
        </ButtonLink>
      </PanelFooter>
    </Panel>
  )
}
