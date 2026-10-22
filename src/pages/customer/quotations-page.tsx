import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import {
  formatDateVn,
  formatQuotationMoney,
  latestPerRequest,
  quotationStatusMeta,
  quotationTitle,
} from '@/features/quotations/quotationDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useMyQuotationsQuery } from '@/hooks/useCustomerQuotations'
import { ROUTES, withId } from '@/routes/paths'
import type { QuotationView } from '@/types/res/quotationsRes'

// Báo giá lắp đặt của khách, mỗi công trình một dòng (bản mới nhất). Báo giá chờ trả lời lên đầu, rồi mới gửi trước
function byNextAction(a: QuotationView, b: QuotationView) {
  if (a.canAccept !== b.canAccept) return a.canAccept ? -1 : 1
  return new Date(b.issuedAt ?? 0).getTime() - new Date(a.issuedAt ?? 0).getTime()
}

export function CustomerQuotationsPage() {
  const query = useMyQuotationsQuery()
  // Báo giá không kèm tên công trình, lấy từ yêu cầu khảo sát; chưa tải xong thì ghi theo số báo giá
  const requests = useMyRequestsQuery()
  const names = new Map(requests.data?.map((r) => [r.surveyRequestId, r.propertyName]))
  const waiting = query.data ? latestPerRequest(query.data).filter((q) => q.canAccept).length : 0

  return (
    <>
      <PageHeader
        title="Báo giá"
        description={
          waiting > 0 ? (
            <Badge tone="danger" icon="request_quote">
              {waiting} báo giá chờ bạn trả lời
            </Badge>
          ) : undefined
        }
      />
      <QueryBoundary query={query}>
        {(list) => {
          const rows = latestPerRequest(list).sort(byNextAction)
          return rows.length === 0 ? (
            <EmptyState
              title="Chưa có báo giá"
              description="Sau khi kỹ thuật viên khảo sát tại công trình, nhân viên kinh doanh lập báo giá và gửi cho bạn ở đây."
              action={
                <ButtonLink to={ROUTES.customer.requests} variant="info" icon="visibility">
                  Xem yêu cầu khảo sát
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((q) => {
                const status = quotationStatusMeta(q, 'customer')
                return (
                  <ListRow key={q.quotationId}>
                    <div className="grid gap-x-8 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <h2 className="text-title font-semibold">
                          {names.get(q.surveyRequestId) || `Báo giá ${q.quoteNumber}`}
                        </h2>
                        <p className="tnum mt-1 text-body text-fg-2">
                          Số {quotationTitle(q)}, gửi {formatDateVn(q.issuedAt)}
                        </p>
                        <p className="tnum mt-2 text-body text-fg">
                          Tổng cộng{' '}
                          <span className="font-semibold">{formatQuotationMoney(q.totalAmount, q.currency)}</span>
                          {q.status === 'ISSUED' && (
                            <span className="text-fg-2">
                              , {q.isExpired ? 'đã hết hạn' : 'hiệu lực đến hết'} ngày {formatDateVn(q.validUntil)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        <ButtonLink
                          icon="visibility"
                          to={withId(ROUTES.customer.quotation, q.quotationId)}
                          size="sm"
                          variant="info"
                        >
                          Xem báo giá
                        </ButtonLink>
                      </div>
                    </div>
                  </ListRow>
                )
              })}
            </ul>
          )
        }}
      </QueryBoundary>
    </>
  )
}
