import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { ServiceRequestList } from '@/features/after-sales/ServiceRequestList'
import { byRequestRank, isTodo } from '@/features/after-sales/serviceDisplay'
import { useMyServiceRequestsQuery } from '@/hooks/useCustomerServiceRequests'
import { ROUTES } from '@/routes/paths'

// Mọi yêu cầu bảo hành, sửa chữa, bảo trì lẻ của khách. Gửi yêu cầu mới từ trang công trình đã bàn giao
export function CustomerAfterSalesPage() {
  const query = useMyServiceRequestsQuery()
  const rows = [...(query.data ?? [])].sort(byRequestRank('customer'))
  const todo = rows.filter((r) => isTodo(r.status, 'customer')).length

  return (
    <>
      <PageHeader
        title="Bảo hành, sửa chữa"
        description={
          todo > 0 ? (
            <Badge tone="danger" icon="assignment_late">
              {todo} yêu cầu chờ bạn duyệt báo giá hoặc nghiệm thu
            </Badge>
          ) : (
            'Báo lỗi hoặc đặt bảo trì lẻ ở trang công trình đã bàn giao.'
          )
        }
        actions={
          <ButtonLink to={ROUTES.customer.projects} variant="secondary">
            Công trình của tôi
          </ButtonLink>
        }
      />
      <QueryBoundary query={query}>
        {() =>
          rows.length === 0 ? (
            <EmptyState
              title="Chưa có yêu cầu nào"
              description="Mở công trình đã bàn giao rồi bấm Báo lỗi hoặc Đặt bảo trì lẻ."
            />
          ) : (
            <ServiceRequestList rows={rows} viewer="customer" detailPattern={ROUTES.customer.afterSalesRequest} />
          )
        }
      </QueryBoundary>
    </>
  )
}
