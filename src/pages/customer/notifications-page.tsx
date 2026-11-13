import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { CUSTOMER_NOTIFICATION_TYPES } from '@/common/afterSales'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { PagedList } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMarkNotificationReadMutation, useNotificationsQuery } from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { NotificationView } from '@/types/res/customerAfterSalesRes'
import { cx } from '@/utils/cx'

// Thông báo trong ứng dụng (backend không gửi email hay push), mới nhất trước. Trạng thái đã đọc lưu trên server nên mọi máy
// cùng thấy. Đánh dấu từng thông báo khi khách mở hoặc bấm "Đã đọc": lệnh ghi bị giới hạn số lần mỗi phút nên không tự đánh
// dấu cả trang. Câu `message` của backend là tiếng Anh nên trang chỉ hiện nhãn theo `type`

const label = (n: NotificationView) => CUSTOMER_NOTIFICATION_TYPES[n.type] ?? 'Có cập nhật mới'

/** Thông báo trước khi lắp đặt không có requestId / subscriptionId: dẫn tới mục theo loại */
function target(n: NotificationView) {
  if (n.requestId) return { to: withId(ROUTES.customer.afterSalesRequest, n.requestId), text: 'Xem yêu cầu' }
  if (n.subscriptionId) return { to: ROUTES.customer.packages, text: 'Xem gói dịch vụ' }
  if (n.type.startsWith('SURVEY_')) return { to: ROUTES.customer.requests, text: 'Xem lịch khảo sát' }
  if (n.type === 'INSTALLATION_QUOTATION_ISSUED') return { to: ROUTES.customer.quotations, text: 'Xem báo giá' }
  if (n.type.startsWith('CONTRACT_')) return { to: ROUTES.customer.contracts, text: 'Xem hợp đồng' }
  if (n.type.startsWith('INSTALLATION_') || n.type === 'EQUIPMENT_SUBSTITUTION_APPROVAL_REQUIRED')
    return { to: ROUTES.customer.projects, text: 'Xem công trình' }
  return null
}

export function CustomerNotificationsPage() {
  const query = useNotificationsQuery()
  const markRead = useMarkNotificationReadMutation()
  const navigate = useNavigate()
  const unread = query.data?.filter((n) => !n.readAt).length ?? 0

  async function read(n: NotificationView) {
    try {
      await markRead.mutateAsync(n.notificationId)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  // Mở trang đích trước, đánh dấu đã đọc chạy nền: lỗi đánh dấu không giữ khách lại
  function open(n: NotificationView, to: string) {
    if (!n.readAt) markRead.mutate(n.notificationId)
    void navigate(to)
  }

  return (
    <>
      <PageHeader title="Thông báo" description={unread > 0 ? `${unread} thông báo chưa đọc` : undefined} />
      <QueryBoundary query={query}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState
              title="Chưa có thông báo"
              description="Lịch khảo sát, báo giá, hợp đồng, lắp đặt, bảo hành và gói dịch vụ có thay đổi thì hiện ở đây."
            />
          ) : (
            <PagedList items={list} noun="thông báo">
              {(rows) => (
                <ul className="divide-y divide-line">
                  {rows.map((n) => {
                    const link = target(n)
                    const isUnread = !n.readAt
                    const busy = markRead.isPending && markRead.variables === n.notificationId
                    return (
                      <ListRow key={n.notificationId}>
                        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
                          <div className="min-w-0">
                            <p className={cx('text-body text-fg', isUnread ? 'font-semibold' : 'font-normal')}>
                              {label(n)}
                            </p>
                            <p className="tnum mt-1 flex flex-wrap items-center gap-x-3 text-meta text-fg-2">
                              {formatMoment(n.createdAt)}
                              {isUnread && <Badge tone="info">Chưa đọc</Badge>}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {link && (
                              <Button size="sm" variant="info" icon="visibility" onClick={() => open(n, link.to)}>
                                {link.text}
                              </Button>
                            )}
                            {isUnread && (
                              <Button
                                size="sm"
                                variant="ghost"
                                bleed={false}
                                icon="done"
                                disabled={busy}
                                onClick={() => void read(n)}
                              >
                                {busy ? 'Đang lưu…' : 'Đã đọc'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </ListRow>
                    )
                  })}
                </ul>
              )}
            </PagedList>
          )
        }
      </QueryBoundary>
    </>
  )
}
