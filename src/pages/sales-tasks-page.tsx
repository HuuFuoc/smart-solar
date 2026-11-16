import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { FOLLOW_UP_OUTCOMES, SALES_TASK_TYPES } from '@/common/afterSales'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { SearchInput, Select } from '@/components/common/ui/field'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { PagedList } from '@/components/common/ui/pagination'
import { EmptyState, ErrorState, Skeleton, UnavailableState } from '@/components/common/ui/states'
import { SummaryTile } from '@/components/common/ui/summary-tile'
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
import { fold } from '@/utils/fold'

// Hàng việc sau bán của kinh doanh nhìn từ quản lý / quản trị: báo giá sửa chữa, báo giá bảo trì lẻ, nhắc khách đặt lịch bảo
// trì của gói, nhắc khách nghiệm thu. Kinh doanh tự nhận việc; quản trị giao việc chưa ai nhận hoặc giao lại kèm lý do, quản lý
// chỉ xem. Không có hạn xử lý của nhân viên: FE không đếm giờ. Việc nhắc bảo trì quá hạn do backend tự đóng (số ngày là cài đặt)

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
const LABELS = ['Việc & kết quả', 'Yêu cầu liên kết', 'Người giữ', 'Tạo lúc', 'Tình hình', 'Thao tác']

const TAG_TONES = ['ok', 'info', 'warn', 'danger'] as const

type Sort = 'newest' | 'oldest'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]!.toUpperCase())
    .join('')

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
  const requestUrl = task.requestId ? withId(REQUEST_PATTERN[viewer], task.requestId) : null
  const when = formatMoment(task.createdAt)
  return (
    <ListRow>
      <ListCells columns={COLUMNS}>
        <ListCell wide>
          <div className="flex items-start gap-3">
            <span className="sv-stat-icon size-10! shrink-0" data-tone="ok" aria-hidden>
              <Icon name="description" className="text-[20px]" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-fg">{salesTaskTypeLabel(task.taskType)}</p>
              {note && <p className="text-meta text-fg-2">{note}</p>}
              {task.outcome && (
                <p className="flex flex-wrap items-center gap-2 text-meta text-fg-3">
                  Kết quả:
                  <span className="sv-tag" data-tone="ok">
                    {FOLLOW_UP_OUTCOMES[task.outcome]?.label ?? task.outcome}
                  </span>
                </p>
              )}
            </div>
          </div>
        </ListCell>
        <ListCell label="Yêu cầu liên kết" className="tnum">
          {requestUrl && task.requestId ? (
            <Link className="ui-link inline-flex items-center gap-1 font-semibold" to={requestUrl}>
              {shortCode(task.requestId)}
              <Icon name="open_in_new" className="text-[16px]" />
            </Link>
          ) : task.entitlementId ? (
            'Lượt bảo trì của gói'
          ) : (
            '—'
          )}
        </ListCell>
        <ListCell label="Người giữ">
          {task.assignedSalesUserId ? (
            <span className="flex items-center gap-2">
              <span className="sv-avatar-sm" aria-hidden>
                {ownerName ? initials(ownerName) : <Icon name="person" className="text-[16px]" />}
              </span>
              {ownerName ?? 'Đã có người nhận'}
            </span>
          ) : (
            <span className="text-fg-3">Chưa ai</span>
          )}
        </ListCell>
        <ListCell label="Tạo lúc" className="tnum">
          <span className="flex items-center gap-1.5">
            <Icon name="calendar_today" className="text-[16px] text-fg-3" />
            <span>
              {when.slice(0, 10)} <span className="text-fg-3">{when.slice(11)}</span>
            </span>
          </span>
        </ListCell>
        <ListCell label="Tình hình">
          <span className="sv-tag" data-tone={TAG_TONES.find((t) => t === status.tone) ?? 'neutral'} data-shape="pill">
            {status.label}
          </span>
        </ListCell>
        <ListCell wide className="lg:justify-self-end">
          <div className="flex flex-wrap items-center gap-2">
            {onAssign && canAssignTask(task) && (
              <Button icon="assignment_ind" size="sm" variant="soft" onClick={() => onAssign(task)}>
                {isReassignment(task) ? 'Giao lại' : 'Giao việc'}
              </Button>
            )}
            {requestUrl && (
              <ButtonLink icon="visibility" to={requestUrl} size="sm" variant="info">
                Chi tiết
              </ButtonLink>
            )}
          </div>
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
  const [keyword, setKeyword] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  // Toàn bộ hàng việc cho số đếm và bộ lọc "Đang mở" / "Tất cả"; trạng thái cụ thể thì backend lọc (query `status`)
  const all = useSalesTasksQuery()
  const param = taskStatusParam(status)
  const filtered = useSalesTasksQuery(param, { enabled: param !== undefined })
  const query = param === undefined ? all : filtered
  // Chỉ quản trị đọc được danh sách tài khoản kinh doanh nên chỉ quản trị giao việc
  const canAssign = viewer === 'admin'
  const sales = useSalesAssigneesQuery({ enabled: canAssign })
  const salesUsers = sales.data
  const nameOf = (id: string | null) => (id ? salesUsers?.find((u) => u.userId === id)?.fullName || null : null)

  const count = (f: TaskStatusFilter) => {
    const list = all.data ?? []
    if (f === 'all') return list.length
    return f === 'open' ? list.filter(canAssignTask).length : list.filter((t) => t.status === f).length
  }
  const key = fold(keyword.trim())
  const matched = (query.data ?? []).filter(
    (t) =>
      matchesTaskFilter(t, { status, type, assignee }) &&
      (!key || fold(`${salesTaskTypeLabel(t.taskType)} ${t.requestId ? shortCode(t.requestId) : ''}`).includes(key)),
  )
  const rows = [...matched].sort((a, b) => {
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return sort === 'newest' ? diff : -diff
  })
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

  const total = count('all')
  const done = count('DONE')
  const donePercent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="sv-list">
      <PageHeader
        title="Việc của kinh doanh"
        description="Theo dõi báo giá sửa chữa, việc nhắc khách đặt lịch bảo trì và nghiệm thu của kinh doanh."
      />

      {all.data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            upper
            label="Tổng công việc"
            count={total}
            note={unassigned > 0 ? `${unassigned} việc chưa ai nhận` : 'Đã phân công đầy đủ'}
            icon="inventory_2"
            tone="neutral"
            active={status === 'all'}
            onClick={() => setStatus('all')}
          />
          <SummaryTile
            upper
            label="Đã hoàn tất (xong)"
            count={done}
            note={total > 0 ? `${donePercent}% tổng việc` : 'Chưa có việc'}
            icon="task_alt"
            tone="ok"
            active={status === 'DONE'}
            onClick={() => setStatus('DONE')}
          />
          <SummaryTile
            upper
            label="Đang chờ xử lý"
            count={count('open')}
            note={count('open') === 0 ? 'Chưa có yêu cầu mới' : 'chưa xong'}
            icon="schedule"
            tone="warn"
            active={status === 'open'}
            onClick={() => setStatus('open')}
          />
          <SummaryTile
            upper
            label="Chưa ai nhận"
            count={unassigned}
            note={unassigned === 0 ? 'Không có tồn đọng' : 'cần giao việc'}
            icon="person_search"
            tone={unassigned > 0 ? 'danger' : 'neutral'}
            active={status === 'OPEN'}
            onClick={() => setStatus('OPEN')}
          />
        </div>
      )}

      <div className="sv-card sv-flush">
        {all.data && (
          <FilterChips
            label="Trạng thái việc"
            className="px-4"
            value={status}
            onChange={setStatus}
            chips={TASK_STATUS_FILTERS.map((f) => ({ value: f, label: STATUS_LABELS[f], count: count(f) }))}
          />
        )}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="w-full min-w-56 flex-1 sm:w-auto">
            <SearchInput
              name="task-search"
              placeholder="Tìm theo mã yêu cầu, loại việc"
              maxLength={100}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onClear={() => setKeyword('')}
            />
          </div>
          <label className="flex items-center gap-2 text-meta text-fg-2">
            Loại việc:
            <Select
              id="task-type"
              value={type}
              active={type !== ''}
              onChange={(e) => setType(e.target.value)}
              className="w-44"
            >
              <option value="">Mọi loại</option>
              {Object.entries(SALES_TASK_TYPES).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2 text-meta text-fg-2">
            Người giữ:
            <Select
              id="task-assignee"
              value={assignee}
              active={assignee !== ''}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-44"
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
          </label>
          <label className="flex items-center gap-2 text-meta text-fg-2 sm:ml-auto">
            Sắp xếp:
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-44">
              <option value="newest">Thời gian tạo mới nhất</option>
              <option value="oldest">Thời gian tạo cũ nhất</option>
            </Select>
          </label>
        </div>

        <section aria-label={STATUS_LABELS[status]} aria-busy={query.isFetching}>
          {query.isPending ? (
            <div aria-label="Đang tải" className="space-y-4 p-4">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : unavailable ? (
            <div className="p-4">
              <UnavailableState
                title="Hàng việc chưa sẵn sàng."
                message={errorMessage(query.error)}
                pendingMigrations={pendingMigrationsOf(query.error)}
              />
            </div>
          ) : query.isError ? (
            <div className="p-4">
              <ErrorState
                message={errorMessage(query.error, 'Không tải được hàng việc.')}
                onRetry={() => void query.refetch()}
              />
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 pb-4">
              <EmptyState
                title="Không có việc nào khớp bộ lọc"
                description={
                  status === 'open' && !type && !assignee && !key
                    ? 'Việc hiện ở đây khi khách phải trả tiền sửa chữa, đặt bảo trì lẻ, chưa đặt lịch bảo trì của gói hoặc chưa nghiệm thu.'
                    : undefined
                }
              />
            </div>
          ) : (
            <PagedList
              key={`${status}-${type}-${assignee}-${key}-${sort}`}
              items={rows}
              noun="công việc"
              keepScroll
              pagerClassName="px-4 pb-4"
            >
              {(pageRows) => (
                <div>
                  <div className="bg-surface-2 px-4">
                    <ListHead columns={COLUMNS} labels={LABELS} />
                  </div>
                  <ul className="divide-y divide-line border-t border-line px-4">
                    {pageRows.map((t) => (
                      <TaskRow
                        key={t.taskId}
                        task={t}
                        viewer={viewer}
                        ownerName={nameOf(t.assignedSalesUserId)}
                        onAssign={canAssign ? setAssigning : null}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </PagedList>
          )}
        </section>
      </div>

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
    </div>
  )
}

export function ManageSalesTasksPage() {
  return <SalesTasksPage viewer="manager" />
}

export function AdminSalesTasksPage() {
  return <SalesTasksPage viewer="admin" />
}
