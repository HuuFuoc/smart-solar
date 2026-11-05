import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { FollowUpDialog } from '@/features/after-sales/FollowUpDialog'
import { canRecordFollowUp, canStartTask, isFollowUpTask, taskNoteText } from '@/features/after-sales/salesTaskRules'
import { isQuotationTask, salesTaskStatusLabel, salesTaskTypeLabel } from '@/features/after-sales/serviceDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import {
  useClaimTaskMutation,
  useMyTasksQuery,
  useOpenTasksQuery,
  useStartTaskMutation,
} from '@/hooks/useSalesAfterSales'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

// Hàng việc sau bán của kinh doanh: báo giá sửa chữa, bảo trì lẻ (nhận việc rồi lập báo giá) và việc nhắc khách (đặt lịch
// bảo trì của gói, nghiệm thu: nhận việc, gọi khách rồi ghi lại). Backend chỉ trả việc còn mở của mình, việc đã xong rời
// danh sách. Việc nhắc bảo trì quá hạn do hệ thống tự đóng; FE chỉ hiện điều backend trả

type Tab = 'open' | 'mine'

const COLUMNS = 'lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_16rem]'
const LABELS = ['Việc', 'Yêu cầu', 'Tạo lúc', 'Tình hình', '']

const EMPTY: Record<Tab, { title: string; description?: string }> = {
  open: {
    title: 'Không có việc nào chờ nhận',
    description:
      'Việc báo giá hiện ở đây khi khách phải trả tiền sửa chữa hoặc đặt bảo trì lẻ; việc nhắc khách hiện khi khách chưa đặt lịch bảo trì của gói hoặc chưa nghiệm thu.',
  },
  mine: { title: 'Bạn không có việc nào đang mở', description: 'Việc đã xong không còn hiện ở đây.' },
}

function ClaimButton({ task }: { task: SalesTaskView }) {
  const claim = useClaimTaskMutation()
  const navigate = useNavigate()
  async function run() {
    try {
      await claim.mutateAsync(task.taskId)
      toast.success('Đã nhận việc.')
      if (isQuotationTask(task) && task.requestId) void navigate(withId(ROUTES.ops.afterSalesRequest, task.requestId))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <Button icon="assignment_turned_in" size="sm" variant="soft" disabled={claim.isPending} onClick={() => void run()}>
      {claim.isPending ? 'Đang nhận…' : 'Nhận việc'}
    </Button>
  )
}

function StartButton({ task }: { task: SalesTaskView }) {
  const start = useStartTaskMutation()
  async function run() {
    try {
      await start.mutateAsync(task.taskId)
      toast.success('Đã bắt đầu xử lý.')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <Button icon="play_arrow" size="sm" variant="info" disabled={start.isPending} onClick={() => void run()}>
      {start.isPending ? 'Đang gửi…' : 'Bắt đầu'}
    </Button>
  )
}

function TaskRow({ task, tab, onFollowUp }: { task: SalesTaskView; tab: Tab; onFollowUp: (t: SalesTaskView) => void }) {
  const note = isFollowUpTask(task) ? taskNoteText(task.note) : null
  return (
    <ListRow>
      <ListCells columns={COLUMNS}>
        <ListCell wide>
          <p className="font-semibold">{salesTaskTypeLabel(task.taskType)}</p>
          {note && <p className="text-meta text-fg-2">{note}</p>}
        </ListCell>
        <ListCell label="Yêu cầu" className="tnum">
          {task.requestId ? (
            <Link className="ui-link" to={withId(ROUTES.ops.afterSalesRequest, task.requestId)}>
              {shortCode(task.requestId)}
            </Link>
          ) : task.entitlementId ? (
            'Lượt bảo trì của gói'
          ) : (
            '—'
          )}
        </ListCell>
        <ListCell label="Tạo lúc" className="tnum">
          {formatMoment(task.createdAt)}
        </ListCell>
        <ListCell label="Tình hình">
          <Badge tone="info">{salesTaskStatusLabel(task.status)}</Badge>
        </ListCell>
        <ListCell wide className="flex flex-wrap gap-2 lg:justify-self-end">
          {tab === 'open' ? (
            <ClaimButton task={task} />
          ) : (
            <>
              {canStartTask(task) && <StartButton task={task} />}
              {canRecordFollowUp(task) && (
                <Button icon="add_call" size="sm" variant="soft" onClick={() => onFollowUp(task)}>
                  Ghi liên hệ
                </Button>
              )}
              {isQuotationTask(task) && task.requestId && (
                <ButtonLink
                  to={withId(ROUTES.ops.afterSalesRequest, task.requestId)}
                  size="sm"
                  variant="soft"
                  icon="request_quote"
                >
                  Lập báo giá
                </ButtonLink>
              )}
            </>
          )}
        </ListCell>
      </ListCells>
    </ListRow>
  )
}

export function OpsAfterSalesPage() {
  const open = useOpenTasksQuery()
  const mine = useMyTasksQuery()
  const [picked, setPicked] = useState<Tab | null>(null)
  const [followUp, setFollowUp] = useState<SalesTaskView | null>(null)
  const groups: Record<Tab, SalesTaskView[]> = { open: open.data ?? [], mine: mine.data ?? [] }
  const tab: Tab = picked ?? (groups.mine.length > 0 ? 'mine' : 'open')
  const query = tab === 'open' ? open : mine

  return (
    <>
      <PageHeader
        title="Bảo hành, sửa chữa"
        description={
          groups.open.length > 0 ? <Badge tone="danger">{groups.open.length} việc chờ nhận</Badge> : undefined
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
                  <TaskRow key={task.taskId} task={task} tab={tab} onFollowUp={setFollowUp} />
                ))}
              </ul>
            </div>
          )
        }
      </QueryBoundary>
      {followUp && <FollowUpDialog key={followUp.taskId} task={followUp} onClose={() => setFollowUp(null)} />}
    </>
  )
}
