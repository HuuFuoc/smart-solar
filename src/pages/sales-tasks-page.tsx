import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { FOLLOW_UP_OUTCOMES, SALES_TASK_TYPES } from '@/common/afterSales'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { Field, Select } from '@/components/common/ui/field'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { EmptyState, ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { AssignTaskDialog } from '@/features/after-sales/AssignTaskDialog'
import { taskQueueStatusMeta } from '@/features/after-sales/managerAfterSalesDisplay'
import {
  TASK_STATUS_FILTERS,
  canAssignTask,
  isReassignment,
  matchesTaskFilter,
  taskStatusParam,
  type TaskStatusFilter,
} from '@/features/after-sales/managerAfterSalesRules'
import { isFollowUpTask, taskNoteText } from '@/features/after-sales/salesTaskRules'
import { salesTaskTypeLabel } from '@/features/after-sales/serviceDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useSalesAssigneesQuery, useSalesTasksQuery } from '@/hooks/useManagerAfterSales'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage, isFeatureUnavailable, pendingMigrationsOf } from '@/services/api/errors'
import type { SalesTaskView } from '@/types/res/salesAfterSalesRes'

// Hàng việc sau bán của kinh doanh nhìn từ quản lý / quản trị: báo giá sửa chữa, báo giá bảo trì lẻ, nhắc khách đặt lịch bảo
// trì của gói, nhắc khách nghiệm thu. Kinh doanh tự nhận việc; quản lý giao việc chưa ai nhận hoặc giao lại kèm lý do. Không
// có hạn xử lý của nhân viên: FE không đếm giờ. Việc nhắc bảo trì quá hạn do backend tự đóng (số ngày là cài đặt).
// Người nhận chọn trong danh sách kinh doanh đang hoạt động mà cả quản lý và quản trị đọc được (GET .../sales-assignees)

type Viewer = 'manager' | 'admin'

const STATUS_LABELS: Record<TaskStatusFilter, string> = {
  open: 'Đang mở',
  OPEN: 'Chưa ai nhận',
  CLAIMED: 'Đã nhận',
  IN_PROGRESS: 'Đang làm',
  DONE: 'Xong',
  CANCELLED: 'Đã huỷ',
  all: 'Tất cả',
}

const COLUMNS = 'lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_9rem]'
const LABELS = ['Việc', 'Yêu cầu', 'Người giữ', 'Tạo lúc', 'Tình hình', '']

const REQUEST_PATTERN: Record<Viewer, string> = {
  manager: ROUTES.manage.afterSalesRequest,
  admin: ROUTES.admin.afterSalesRequest,
}

function TaskRow({
  task,
  viewer,
  ownerName,
  onAssign,
}: {
  task: SalesTaskView
  viewer: Viewer
  ownerName: string | null
  onAssign: ((t: SalesTaskView) => void) | null
}) {
  const status = taskQueueStatusMeta(task.status)
  const note = isFollowUpTask(task) ? taskNoteText(task.note) : null
  return (
    <ListRow>
      <ListCells columns={COLUMNS}>
        <ListCell wide>
          <p className="font-semibold">{salesTaskTypeLabel(task.taskType)}</p>
          {note && <p className="text-meta text-fg-2">{note}</p>}
          {task.outcome && (
            <p className="text-meta text-fg-2">Kết quả: {FOLLOW_UP_OUTCOMES[task.outcome]?.label ?? task.outcome}</p>
          )}
        </ListCell>
        <ListCell label="Yêu cầu" className="tnum">
          {task.requestId ? (
            <Link className="ui-link" to={withId(REQUEST_PATTERN[viewer], task.requestId)}>
              {shortCode(task.requestId)}
            </Link>
          ) : task.entitlementId ? (
            'Lượt bảo trì của gói'
          ) : (
            '—'
          )}
        </ListCell>
        <ListCell label="Người giữ">
          {task.assignedSalesUserId ? (ownerName ?? 'Đã có người nhận') : <span className="text-fg-3">Chưa ai</span>}
        </ListCell>
        <ListCell label="Tạo lúc" className="tnum">
          {formatMoment(task.createdAt)}
        </ListCell>
        <ListCell label="Tình hình">
          <Badge tone={status.tone}>{status.label}</Badge>
        </ListCell>
        <ListCell wide className="lg:justify-self-end">
          {onAssign && canAssignTask(task) && (
            <Button icon="assignment_ind" size="sm" variant="soft" onClick={() => onAssign(task)}>
              {isReassignment(task) ? 'Giao lại' : 'Giao việc'}
            </Button>
          )}
        </ListCell>
      </ListCells>
    </ListRow>
  )
}

function SalesTasksPage({ viewer }: { viewer: Viewer }) {
  const [params, setParams] = useSearchParams()
  const raw = params.get('trang-thai') as TaskStatusFilter | null
  const status: TaskStatusFilter = raw && TASK_STATUS_FILTERS.includes(raw) ? raw : 'open'
  const [type, setType] = useState('')
  const [assignee, setAssignee] = useState('')
  const [assigning, setAssigning] = useState<SalesTaskView | null>(null)
  // Toàn bộ hàng việc cho số đếm và bộ lọc "Đang mở" / "Tất cả"; trạng thái cụ thể thì backend lọc (query `status`)
  const all = useSalesTasksQuery()
  const param = taskStatusParam(status)
  const filtered = useSalesTasksQuery(param, { enabled: param !== undefined })
  const query = param === undefined ? all : filtered
  const sales = useSalesAssigneesQuery()
  const salesUsers = sales.data
  const nameOf = (id: string | null) => (id ? (salesUsers?.find((u) => u.userId === id)?.fullName || null) : null)

  const count = (f: TaskStatusFilter) => {
    const list = all.data ?? []
    if (f === 'all') return list.length
    return f === 'open' ? list.filter(canAssignTask).length : list.filter((t) => t.status === f).length
  }
  const rows = (query.data ?? []).filter((t) => matchesTaskFilter(t, { status, type, assignee }))
  const unassigned = (all.data ?? []).filter((t) => t.status === 'OPEN').length
  const unavailable = query.isError && isFeatureUnavailable(query.error)

  const setStatus = (next: TaskStatusFilter) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'open') p.delete('trang-thai')
        else p.set('trang-thai', next)
        return p
      },
      { replace: true },
    )

  return (
    <>
      <PageHeader
        title="Việc của kinh doanh"
        description={
          unassigned > 0 ? (
            <Badge tone="danger" icon="assignment_late">
              {unassigned} việc chưa ai nhận
            </Badge>
          ) : undefined
        }
      />
      {all.data && (
        <FilterChips
          label="Trạng thái việc"
          className="mb-4"
          value={status}
          onChange={setStatus}
          chips={TASK_STATUS_FILTERS.map((f) => ({ value: f, label: STATUS_LABELS[f], count: count(f) }))}
        />
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <Field label="Loại việc" htmlFor="task-type">
          <Select id="task-type" value={type} active={type !== ''} onChange={(e) => setType(e.target.value)}>
            <option value="">Mọi loại</option>
            {Object.entries(SALES_TASK_TYPES).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Người giữ" htmlFor="task-assignee">
          <Select
            id="task-assignee"
            value={assignee}
            active={assignee !== ''}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">Mọi người</option>
            <option value="none">Chưa ai nhận</option>
            <option value="some">Đã có người nhận</option>
            {(salesUsers ?? []).map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.fullName || 'Chưa có họ tên'}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <section aria-label={STATUS_LABELS[status]} aria-busy={query.isFetching}>
        {query.isPending ? (
          <div aria-label="Đang tải" className="space-y-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : unavailable ? (
          <UnavailableState
            title="Hàng việc chưa sẵn sàng."
            message={errorMessage(query.error)}
            pendingMigrations={pendingMigrationsOf(query.error)}
          />
        ) : query.isError ? (
          <ErrorState
            message={errorMessage(query.error, 'Không tải được hàng việc.')}
            onRetry={() => void query.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Không có việc nào khớp bộ lọc"
            description={
              status === 'open' && !type && !assignee
                ? 'Việc hiện ở đây khi khách phải trả tiền sửa chữa, đặt bảo trì lẻ, chưa đặt lịch bảo trì của gói hoặc chưa nghiệm thu.'
                : undefined
            }
          />
        ) : (
          <div>
            <ListHead columns={COLUMNS} labels={LABELS} />
            <ul className="divide-y divide-line">
              {rows.map((t) => (
                <TaskRow
                  key={t.taskId}
                  task={t}
                  viewer={viewer}
                  ownerName={nameOf(t.assignedSalesUserId)}
                  onAssign={setAssigning}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      <AssignTaskDialog
        task={assigning}
        sales={{
          isPending: sales.isPending,
          isError: sales.isError,
          error: sales.error,
          data: salesUsers,
          refetch: () => void sales.refetch(),
        }}
        onClose={() => setAssigning(null)}
      />
    </>
  )
}

export function ManageSalesTasksPage() {
  return <SalesTasksPage viewer="manager" />
}

export function AdminSalesTasksPage() {
  return <SalesTasksPage viewer="admin" />
}
