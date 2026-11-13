import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { CustomerQuotationTables } from '@/features/quotations/CustomerQuotationTables'
import { latestPerRequest } from '@/features/quotations/quotationDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useMyQuotationsQuery } from '@/hooks/useCustomerQuotations'
import { ROUTES } from '@/routes/paths'
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
        description={waiting > 0 ? <Badge tone="danger">{waiting} báo giá chờ bạn trả lời</Badge> : undefined}
      />
      <QueryBoundary query={query}>
        {(list) => {
          const rows = latestPerRequest(list).sort(byNextAction)
          return rows.length === 0 ? (
            <EmptyState
              title="Chưa có báo giá"
              action={
                <ButtonLink to={ROUTES.customer.requests} variant="info" icon="visibility">
                  Xem yêu cầu khảo sát
                </ButtonLink>
              }
            />
          ) : (
            <CustomerQuotationTables quotations={rows} propertyNames={names} />
          )
        }}
      </QueryBoundary>
    </>
  )
}
