import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { salesTaskStatusLabel, salesTaskTypeLabel } from '@/features/after-sales/serviceDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useClaimTaskMutation, useMyTasksQuery, useOpenTasksQuery } from '@/hooks/useSalesAfterSales'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

// Việc báo giá sửa chữa và bảo trì lẻ của kinh doanh: nhận việc rồi lập báo giá
// Việc nhắc khách (đặt lịch bảo trì gói, nghiệm thu) chưa làm trên web nên không hiện

type Tab = 'open' | 'mine' | 'done'

const QUOTATION_TASKS = ['REPAIR_QUOTATION', 'MAINTENANCE_QUOTATION']
const COLUMNS = 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_9rem]'
const LABELS = ['Việc', 'Yêu cầu', 'Tạo lúc', 'Tình hình', '']

const EMPTY: Record<Tab, { title: string; description?: string }> = {
  open: {
    title: 'Không có việc báo giá nào chờ nhận',
    description: 'Khi quản lý xác định lỗi khách phải trả tiền, hoặc khách đặt bảo trì lẻ, việc báo giá hiện ở đây.',
  },
  mine: { title: 'Bạn chưa nhận việc báo giá nào' },
  done: { title: 'Chưa có việc nào xong' },
}

function ClaimButton({ task }: { task: SalesTaskView }) {
  const claim = useClaimTaskMutation()
  const navigate = useNavigate()
  async function run() {
    try {
      await claim.mutateAsync(task.taskId)
      toast.success('Đã nhận việc.')
      if (task.requestId) void navigate(withId(ROUTES.ops.afterSalesRequest, task.requestId))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <Button size="sm" variant="soft" disabled={claim.isPending} onClick={() => void run()}>
      {claim.isPending ? 'Đang nhận…' : 'Nhận việc'}
    </Button>
  )
}

function TaskRow({ task, tab }: { task: SalesTaskView; tab: Tab }) {
  return (
    <ListRow>
      <ListCells columns={COLUMNS}>
        <ListCell wide>
          <p className="font-semibold">{salesTaskTypeLabel(task.taskType)}</p>
        </ListCell>
        <ListCell label="Yêu cầu" className="tnum">
          {shortCode(task.requestId)}
        </ListCell>
        <ListCell label="Tạo lúc" className="tnum">
          {formatMoment(task.createdAt)}
        </ListCell>
        <ListCell label="Tình hình">
          <Badge tone={tab === 'done' ? 'neutral' : 'info'}>{salesTaskStatusLabel(task.status)}</Badge>
        </ListCell>
        <ListCell wide className="lg:justify-self-end">
          {tab === 'open' ? (
            <ClaimButton task={task} />
          ) : task.requestId ? (
            <ButtonLink
              to={withId(ROUTES.ops.afterSalesRequest, task.requestId)}
              size="sm"
              variant={tab === 'mine' ? 'soft' : 'secondary'}
            >
              {tab === 'mine' ? 'Lập báo giá' : 'Xem'}
            </ButtonLink>
          ) : null}
        </ListCell>
      </ListCells>
    </ListRow>
  )
}

export function OpsAfterSalesPage() {
  const open = useOpenTasksQuery()
  const mine = useMyTasksQuery()
  const [picked, setPicked] = useState<Tab | null>(null)
  const quotation = (t: SalesTaskView) => QUOTATION_TASKS.includes(t.taskType)
  const finished = (t: SalesTaskView) => t.status === 'DONE' || t.status === 'CANCELLED'
  const groups: Record<Tab, SalesTaskView[]> = {
    open: (open.data ?? []).filter(quotation),
    mine: (mine.data ?? []).filter((t) => quotation(t) && !finished(t)),
    done: (mine.data ?? []).filter((t) => quotation(t) && finished(t)),
  }
  const tab: Tab = picked ?? (groups.mine.length > 0 ? 'mine' : 'open')
  const query = tab === 'open' ? open : mine

  return (
    <>
      <PageHeader
        title="Bảo hành, sửa chữa"
        description={
          groups.open.length > 0 ? (
            <Badge tone="danger" icon="assignment_late">
              {groups.open.length} việc báo giá chờ nhận
            </Badge>
          ) : (
            'Báo giá phần sửa chữa khách phải trả tiền và bảo trì lẻ.'
          )
        }
      />
      <FilterChips
        label="Lọc việc"
        className="mb-6"
        value={tab}
        onChange={setPicked}
        chips={[
          { value: 'open', label: 'Chờ nhận', count: groups.open.length },
          { value: 'mine', label: 'Của tôi', count: groups.mine.length },
          { value: 'done', label: 'Đã xong', count: groups.done.length },
        ]}
      />
      <QueryBoundary query={query}>
        {() =>
          groups[tab].length === 0 ? (
            <EmptyState {...EMPTY[tab]} />
          ) : (
            <div>
              <ListHead columns={COLUMNS} labels={LABELS} />
              <ul className="divide-y divide-line">
                {groups[tab].map((task) => (
                  <TaskRow key={task.taskId} task={task} tab={tab} />
                ))}
              </ul>
            </div>
          )
        }
      </QueryBoundary>
    </>
  )
}
