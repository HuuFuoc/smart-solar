import { ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
import { ROUTES, withId } from '@/routes/paths'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

type SalesAfterSalesTasksCardProps = {
  tasks: SalesTaskView[]
  myTasks: SalesTaskView[]
}

export function SalesAfterSalesTasksCard({ tasks, myTasks }: SalesAfterSalesTasksCardProps) {
  const allTasks = [...myTasks, ...tasks]

  return (
    <Panel>
      <PanelHeader
        className="items-start"
        title="Báo giá bảo hành, bảo trì"
        action={
          <ButtonLink to={ROUTES.ops.afterSales} size="sm" variant="info" icon="list">
            Xem tất cả
          </ButtonLink>
        }
      />
      {allTasks.length === 0 ? (
        <p className="text-body text-fg-2">Không có việc báo giá nào chờ</p>
      ) : (
        <ul className="divide-y divide-line">
          {allTasks.slice(0, 4).map((task) => {
            const reqId = task.requestId || ''
            return (
              <ListRow key={task.taskId} className="flex items-center justify-between gap-3 first:pt-0">
                <div className="min-w-0">
                  <p className="text-body font-semibold text-fg">
                    {task.taskType === 'REPAIR_QUOTATION' ? 'Báo giá sửa chữa' : 'Báo giá bảo trì'}
                  </p>
                  <p className="text-meta text-fg-2">Mã yêu cầu {reqId ? reqId.slice(0, 8).toUpperCase() : 'N/A'}</p>
                </div>
                {reqId ? (
                  <ButtonLink to={withId(ROUTES.ops.afterSalesRequest, reqId)} size="sm" variant="soft">
                    Xử lý
                  </ButtonLink>
                ) : null}
              </ListRow>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
