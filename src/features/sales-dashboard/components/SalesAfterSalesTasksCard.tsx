import { Link } from 'react-router'
import { Card } from '@/components/common/stitch-ui/Card'
import { Button } from '@/components/common/stitch-ui/Button'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ROUTES, withId } from '@/routes/paths'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

type SalesAfterSalesTasksCardProps = {
  tasks: SalesTaskView[]
  myTasks: SalesTaskView[]
}

export function SalesAfterSalesTasksCard({ tasks, myTasks }: SalesAfterSalesTasksCardProps) {
  const allTasks = [...myTasks, ...tasks]

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between border-b border-surface-container-highest pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tertiary-container/20 text-tertiary-container">
            <Icon name="handyman" className="text-[20px]" />
          </div>
          <h3 className="text-label-lg font-bold text-on-surface">Báo giá bảo hành, bảo trì</h3>
        </div>
        <Link to={ROUTES.ops.afterSales}>
          <span className="text-label-sm font-semibold text-primary hover:underline">Xem tất cả →</span>
        </Link>
      </div>

      {allTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <Icon name="task_alt" className="text-[24px]" />
          </div>
          <p className="mt-2 text-label-md font-semibold text-on-surface">Không có việc báo giá nào chờ</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {allTasks.slice(0, 4).map((task) => {
            const reqId = task.requestId || ''
            return (
              <div
                key={task.taskId}
                className="flex items-center justify-between rounded-xl bg-surface-container-low p-3"
              >
                <div className="space-y-0.5">
                  <span className="text-label-sm font-semibold text-on-surface">
                    {task.taskType === 'REPAIR_QUOTATION' ? 'Báo giá sửa chữa' : 'Báo giá bảo trì'}
                  </span>
                  <p className="text-body-xs text-on-surface-variant">
                    Mã yêu cầu: {reqId ? reqId.slice(0, 8).toUpperCase() : 'N/A'}
                  </p>
                </div>
                {reqId ? (
                  <Link to={withId(ROUTES.ops.afterSalesRequest, reqId)}>
                    <Button size="sm" variant="tonal">
                      Xử lý
                    </Button>
                  </Link>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
