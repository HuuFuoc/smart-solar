import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { dispatchReasonLabel, dispatchStatusMeta } from '@/features/dispatch/dispatchDisplay'
import { formatAppointment, formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useDispatchQueueQuery } from '@/hooks/useDispatch'
import { ROUTES, withId } from '@/routes/paths'
import type { DispatchQueueItemView } from '@/types/res/dispatchRes'

type Tab = 'todo' | 'waiting' | 'closed'

const EMPTY: Record<Tab, { title: string; description?: string }> = {
  todo: {
    title: 'Không có yêu cầu nào cần xếp kỹ thuật viên',
    description: 'Khách ở khu vực chưa có người nhận lịch gửi yêu cầu thì hiện ở đây.',
  },
  waiting: { title: 'Không có đề xuất nào chờ khách trả lời' },
  closed: { title: 'Chưa có yêu cầu nào đã xong' },
}

const COLUMNS = 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.8fr)_9rem]'

/** Hạn phản hồi hoặc đề xuất đang chờ: chỉ là chữ, việc cần làm đã báo đỏ ở nhãn trạng thái */
function situation(r: DispatchQueueItemView) {
  const p = r.liveProposal
  if (r.status === 'PROPOSAL_PENDING' && p)
    return `Đề xuất ${formatAppointment(p.startsAt, p.endsAt)}, ${p.technicianName}. Khách trả lời trước ${formatMoment(p.expiresAt)}.`
  if (r.status !== 'OPEN') return null
  const due = r.sla.overdue
    ? `Quá hạn phản hồi từ ${formatMoment(r.sla.reviewDueAt)}`
    : `Hạn phản hồi ${formatMoment(r.sla.reviewDueAt)}`
  return r.sla.escalated ? `${due}, đã báo quản trị.` : `${due}.`
}

function DispatchRow({ row: r, detailPattern }: { row: DispatchQueueItemView; detailPattern: string }) {
  const status = dispatchStatusMeta(r.status)
  const text = situation(r)
  return (
    <ListRow>
      <ListCells columns={COLUMNS}>
        <ListCell wide>
          <h2 className="font-semibold">{r.propertyName || 'Công trình chưa đặt tên'}</h2>
          <p className="mt-0.5 text-meta text-fg-2">
            {[r.zone?.name ?? 'Chưa thuộc khu vực nào', r.province].filter(Boolean).join(', ')}
          </p>
        </ListCell>
        <ListCell label="Khách hàng">{r.customerName || '—'}</ListCell>
        <ListCell label="Lý do">{dispatchReasonLabel(r.reason)}</ListCell>
        <ListCell label="Tình hình">
          <Badge tone={status.tone}>{status.label}</Badge>
          {text && <p className="mt-1 text-meta text-fg-2">{text}</p>}
        </ListCell>
        <ListCell wide className="lg:justify-self-end">
          <ButtonLink icon="visibility" to={withId(detailPattern, r.dispatchRequestId)} size="sm" variant="info">
            Mở yêu cầu
          </ButtonLink>
        </ListCell>
      </ListCells>
    </ListRow>
  )
}

// Hàng chờ điều phối của quản lý và quản trị: công trình chưa có kỹ thuật viên nhận lịch, hạn phản hồi sớm nhất trước
function DispatchRequestsPage({ detailPattern }: { detailPattern: string }) {
  const active = useDispatchQueueQuery()
  const [picked, setPicked] = useState<Tab | null>(null)
  const rows = active.data?.items ?? []
  const todo = rows.filter((r) => r.status === 'OPEN')
  const waiting = rows.filter((r) => r.status === 'PROPOSAL_PENDING')
  const tab: Tab = picked ?? (todo.length > 0 || waiting.length === 0 ? 'todo' : 'waiting')
  // Yêu cầu đã xong chỉ tải khi mở tab, gần đây nhất trước
  const done = useDispatchQueueQuery({ done: true, enabled: tab === 'closed' })
  const groups: Record<Tab, DispatchQueueItemView[]> = {
    todo,
    waiting,
    closed: [...(done.data?.items ?? [])].sort(
      (a, b) => new Date(b.sla.reviewDueAt).getTime() - new Date(a.sla.reviewDueAt).getTime(),
    ),
  }
  const query = tab === 'closed' ? done : active
  const overdue = todo.filter((r) => r.sla.overdue).length

  return (
    <>
      <PageHeader
        title="Điều phối kỹ thuật viên"
        description={
          overdue > 0 ? (
            <Badge tone="danger" icon="assignment_late">
              {overdue} yêu cầu quá hạn phản hồi
            </Badge>
          ) : undefined
        }
      />
      <FilterChips
        label="Lọc yêu cầu"
        className="mb-6"
        value={tab}
        onChange={setPicked}
        chips={[
          { value: 'todo', label: 'Cần xếp', count: groups.todo.length },
          { value: 'waiting', label: 'Chờ khách', count: groups.waiting.length },
          { value: 'closed', label: 'Đã xong', count: done.data?.totalItems },
        ]}
      />
      <QueryBoundary query={query}>
        {() =>
          groups[tab].length === 0 ? (
            <EmptyState {...EMPTY[tab]} />
          ) : (
            <>
              <ListHead columns={COLUMNS} labels={['Công trình', 'Khách hàng', 'Lý do', 'Tình hình', '']} />
              <ul className="divide-y divide-line">
                {groups[tab].map((r) => (
                  <DispatchRow key={r.dispatchRequestId} row={r} detailPattern={detailPattern} />
                ))}
              </ul>
            </>
          )
        }
      </QueryBoundary>
    </>
  )
}

export function ManageDispatchRequestsPage() {
  return <DispatchRequestsPage detailPattern={ROUTES.manage.dispatchRequest} />
}

export function AdminDispatchRequestsPage() {
  return <DispatchRequestsPage detailPattern={ROUTES.admin.dispatchRequest} />
}
