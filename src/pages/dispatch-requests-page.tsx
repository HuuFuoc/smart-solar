import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
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

function DispatchRequestsPage({ detailPattern }: { detailPattern: string }) {
  const active = useDispatchQueueQuery()
  const [picked, setPicked] = useState<Tab | null>(null)
  const rows = active.data?.items ?? []
  const todo = rows.filter((r) => r.status === 'OPEN')
  const waiting = rows.filter((r) => r.status === 'PROPOSAL_PENDING')
  const tab: Tab = picked ?? (todo.length > 0 || waiting.length === 0 ? 'todo' : 'waiting')
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
        description={overdue > 0 ? <Badge tone="danger">{overdue} yêu cầu quá hạn phản hồi</Badge> : undefined}
      />
      <FilterChips
        label="Lọc yêu cầu"
        className="mb-4"
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
            <div>
              <Table stack>
                <thead>
                  <tr>
                    <Th>Công trình & Địa bàn</Th>
                    <Th>Khách hàng</Th>
                    <Th>Lý do điều phối</Th>
                    <Th>Tình hình / SLA</Th>
                    <Th className="text-right">
                      <span className="sr-only">Thao tác</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {groups[tab].map((r) => {
                    const status = dispatchStatusMeta(r.status)
                    const text = situation(r)
                    return (
                      <Tr key={r.dispatchRequestId}>
                        <Td label="Công trình">
                          <h2 className="font-semibold text-fg">{r.propertyName || 'Công trình chưa đặt tên'}</h2>
                          <p className="mt-0.5 text-meta text-fg-2">
                            {[r.zone?.name ?? 'Chưa thuộc khu vực nào', r.province].filter(Boolean).join(', ')}
                          </p>
                        </Td>
                        <Td label="Khách hàng" className="font-medium text-fg">
                          {r.customerName || '-'}
                        </Td>
                        <Td label="Lý do" className="text-meta text-fg-2">
                          {dispatchReasonLabel(r.reason)}
                        </Td>
                        <Td label="Tình hình">
                          <Badge tone={status.tone}>{status.label}</Badge>
                          {text && (
                            <p className={`mt-1 text-meta ${r.sla.overdue ? 'font-medium text-danger' : 'text-fg-2'}`}>
                              {text}
                            </p>
                          )}
                        </Td>
                        <Td label="Thao tác" className="text-right whitespace-nowrap">
                          <ButtonLink
                            icon="visibility"
                            to={withId(detailPattern, r.dispatchRequestId)}
                            size="sm"
                            variant="info"
                          >
                            Mở yêu cầu
                          </ButtonLink>
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </div>
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
