import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, UnavailableState } from '@/components/common/ui/states'
import { CustomerContractTables } from '@/features/contracts/CustomerContractTables'
import { isCustomerTodo, latestPerContract } from '@/features/contracts/customerContractRules'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { ROUTES } from '@/routes/paths'
import { isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'

// Hợp đồng lắp đặt của khách, mỗi số hợp đồng một dòng (phiên bản mới nhất). Việc của khách (ký, ký lại, thanh toán) lên đầu.
// Khách chỉ thấy hợp đồng từ lúc kinh doanh gửi ký
export function CustomerContractsPage() {
  const query = useMyContractsQuery()
  // Hợp đồng không kèm tên công trình, lấy từ yêu cầu khảo sát
  const requests = useMyRequestsQuery()
  const names = new Map(requests.data?.map((r) => [r.surveyRequestId, r.propertyName]))
  const todo = query.data ? latestPerContract(query.data).filter(isCustomerTodo).length : 0

  if (query.data === undefined && isFeatureUnavailable(query.error))
    return (
      <>
        <PageHeader title="Hợp đồng" />
        <UnavailableState
          title="Chức năng hợp đồng chưa sẵn sàng."
          message="Hợp đồng chưa mở được trên web. Thử lại sau."
          pendingMigrations={pendingMigrationsOf(query.error)}
        />
      </>
    )

  return (
    <>
      <PageHeader
        title="Hợp đồng"
        description={todo > 0 ? <Badge tone="danger">{todo} hợp đồng chờ bạn ký hoặc thanh toán</Badge> : undefined}
      />
      <QueryBoundary query={query}>
        {(list) => {
          const rows = latestPerContract(list)
          return rows.length === 0 ? (
            <EmptyState
              title="Chưa có hợp đồng"
              description="Hợp đồng hiện ở đây khi bạn đồng ý báo giá và Smart Solar gửi hợp đồng để ký."
              action={
                <ButtonLink to={ROUTES.customer.quotations} variant="info" icon="visibility">
                  Xem báo giá
                </ButtonLink>
              }
            />
          ) : (
            <CustomerContractTables contracts={rows} propertyNames={names} />
          )
        }}
      </QueryBoundary>
    </>
  )
}
