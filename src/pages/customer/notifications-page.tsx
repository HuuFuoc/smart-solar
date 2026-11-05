import { CUSTOMER_NOTIFICATION_TYPES } from '@/common/afterSales'
import { ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useNotificationsQuery } from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import type { NotificationView } from '@/types/res/customerAfterSalesRes'

// Thông báo trong ứng dụng của bảo hành, sửa chữa và gói dịch vụ (backend không gửi email hay push cho các việc này), mới
// nhất trước. Backend chưa có lệnh đánh dấu đã đọc: số cạnh menu chỉ đếm thông báo mới kể từ lần mở trang này trên trình duyệt

const label = (n: NotificationView) => CUSTOMER_NOTIFICATION_TYPES[n.type] ?? 'Có cập nhật mới'

function target(n: NotificationView) {
  if (n.requestId) return { to: withId(ROUTES.customer.afterSalesRequest, n.requestId), text: 'Xem yêu cầu' }
  if (n.subscriptionId) return { to: ROUTES.customer.packages, text: 'Xem gói dịch vụ' }
  return null
}

export function CustomerNotificationsPage() {
  const query = useNotificationsQuery()
  return (
    <>
      <PageHeader title="Thông báo" />
      <QueryBoundary query={query}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState
              title="Chưa có thông báo"
              description="Lịch hẹn, báo giá, kết quả và nhắc việc của bảo hành, gói dịch vụ hiện ở đây."
            />
          ) : (
            <ul className="divide-y divide-line">
              {list.map((n) => {
                const link = target(n)
                return (
                  <ListRow key={n.notificationId}>
                    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
                      <div className="min-w-0">
                        <p className="text-body font-medium text-fg">{label(n)}</p>
                        <p className="tnum mt-1 text-meta text-fg-2">{formatMoment(n.createdAt)}</p>
                      </div>
                      {link && (
                        <ButtonLink to={link.to} size="sm" variant="info" icon="visibility">
                          {link.text}
                        </ButtonLink>
                      )}
                    </div>
                  </ListRow>
                )
              })}
            </ul>
          )
        }
      </QueryBoundary>
    </>
  )
}
