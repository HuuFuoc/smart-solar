import { Badge } from '@/components/common/ui/badge'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, UnavailableState } from '@/components/common/ui/states'
import { CustomerContractTables } from '@/features/contracts/CustomerContractTables'
import { isCustomerTodo, latestPerContract } from '@/features/contracts/customerContractRules'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'

// Hợp đồng lắp đặt của khách: mọi công trình, mọi phiên bản backend trả (kể cả bản nháp 30/70 để đọc trước khi trả 30%). Việc
// của khách (trả 30% / 70%, ký và thanh toán hợp đồng cũ) lên đầu; bản đã huỷ / đã có bản mới để nhóm riêng ở cuối
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
          const rows = [...list].sort((a, b) => Number(isCustomerTodo(b)) - Number(isCustomerTodo(a)))
          return rows.length === 0 ? (
            <EmptyState
              title="Chưa có hợp đồng"
              description="Khi bạn đồng ý báo giá với kỹ thuật viên tại công trình, hợp đồng hiện ở đây để bạn đọc trước khi trả 30%."
            />
          ) : (
            <CustomerContractTables contracts={rows} propertyNames={names} />
          )
        }}
      </QueryBoundary>
    </>
  )
}
