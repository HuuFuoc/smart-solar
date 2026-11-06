import { useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
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

const DISPATCH_BADGE_STYLE: Record<string, { bg: string; text: string; border: string; dot: string; icon: string }> = {
  OPEN: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
    icon: 'error_outline',
  },
  PROPOSAL_PENDING: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    icon: 'hourglass_top',
  },
  ASSIGNED: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    icon: 'check_circle',
  },
  UNSERVICEABLE: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    icon: 'block',
  },
  CLOSED: {
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
    icon: 'done_all',
  },
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

      {/* Thanh chú thích điều phối & tổng hợp */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-container border border-line bg-surface-1 px-4 py-2.5 text-meta shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-fg-2">Chú thích:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-fg-2">Cần xếp KTV</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-fg-2">Chờ khách duyệt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-fg-2">Đã hoàn tất</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-fg-3">
          {overdue > 0 && (
            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
              <Icon name="warning" className="text-[16px]" aria-hidden />
              {overdue} quá hạn SLA
            </span>
          )}
          <span>
            Hiển thị: <strong className="text-fg-1">{groups[tab].length}</strong> yêu cầu
          </span>
        </div>
      </div>

      <QueryBoundary query={query}>
        {() =>
          groups[tab].length === 0 ? (
            <EmptyState {...EMPTY[tab]} />
          ) : (
            <div className="overflow-hidden rounded-container border border-line bg-surface-1 shadow-sm">
              <Table stack>
                <thead>
                  <tr>
                    <Th className="border-r border-line">Công trình & Địa bàn</Th>
                    <Th className="border-r border-line">Khách hàng</Th>
                    <Th className="border-r border-line">Lý do điều phối</Th>
                    <Th className="border-r border-line">Tình hình / SLA</Th>
                    <Th className="text-right">
                      <span>Thao tác</span>
                    </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {groups[tab].map((r) => {
                    const status = dispatchStatusMeta(r.status)
                    const text = situation(r)
                    const style = DISPATCH_BADGE_STYLE[r.status] ?? {
                      bg: 'bg-surface-2',
                      text: 'text-fg-2',
                      border: 'border-line',
                      dot: 'bg-fg-3',
                      icon: 'info',
                    }
                    return (
                      <Tr key={r.dispatchRequestId} className="hover:bg-surface-2/60 transition-colors">
                        <Td label="Công trình" className="border-r border-line">
                          <h2 className="font-semibold text-fg">{r.propertyName || 'Công trình chưa đặt tên'}</h2>
                          <p className="mt-0.5 text-meta text-fg-2 flex items-center gap-1">
                            <Icon name="location_on" className="text-accent text-[16px]" aria-hidden />
                            {[r.zone?.name ?? 'Chưa thuộc khu vực nào', r.province].filter(Boolean).join(', ')}
                          </p>
                        </Td>
                        <Td label="Khách hàng" className="border-r border-line font-medium text-fg">
                          {r.customerName || '-'}
                        </Td>
                        <Td label="Lý do" className="border-r border-line text-meta text-fg-2">
                          {dispatchReasonLabel(r.reason)}
                        </Td>
                        <Td label="Tình hình" className="border-r border-line">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-meta font-medium border ${style.bg} ${style.text} ${style.border}`}
                          >
                            <Icon name={style.icon} className="text-[16px]" aria-hidden />
                            <span>{status.label}</span>
                          </span>
                          {text && (
                            <p
                              className={`mt-1 text-meta ${r.sla.overdue ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-fg-2'}`}
                            >
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
              <div className="border-t border-line bg-surface-2/40 px-4 py-2.5 text-meta text-fg-3 flex items-center justify-between">
                <span>Danh sách hàng chờ điều phối SmartSolar</span>
                <span className="tnum">Tổng {groups[tab].length} yêu cầu</span>
              </div>
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
