import { ButtonLink } from '@/components/common/ui/button'
import { ROUTES, withId } from '@/routes/paths'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

type SalesAfterSalesTasksCardProps = {
  tasks: SalesTaskView[]
  myTasks: SalesTaskView[]
}

export function SalesAfterSalesTasksCard({ tasks, myTasks }: SalesAfterSalesTasksCardProps) {
  const allTasks = [...myTasks, ...tasks]

  return (
    <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-title font-semibold text-fg">Báo giá dịch vụ sau bán</h2>
        <ButtonLink
          to={ROUTES.ops.afterSales}
          size="sm"
          variant="ghost"
          icon="list"
          className="text-meta font-medium text-accent-fg hover:underline"
        >
          Xem tất cả
        </ButtonLink>
      </div>

      {allTasks.length === 0 ? (
        <p className="py-2.5 text-center text-body text-fg-2">Không có việc báo giá nào chờ</p>
      ) : (
        <ul className="divide-y divide-line">
          {allTasks.slice(0, 4).map((task) => {
            const reqId = task.requestId || ''
            return (
              <li key={task.taskId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-semibold text-fg">
                    {task.taskType === 'REPAIR_QUOTATION' ? 'Báo giá sửa chữa' : 'Báo giá bảo trì'}
                  </p>
                  <p className="text-meta text-fg-2">Mã yêu cầu: {reqId ? reqId.slice(0, 8).toUpperCase() : '—'}</p>
                </div>
                {reqId ? (
                  <ButtonLink
                    to={withId(ROUTES.ops.afterSalesRequest, reqId)}
                    size="sm"
                    variant="info"
                    icon="arrow_forward"
                  >
                    Xử lý
                  </ButtonLink>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
