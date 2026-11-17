import { useState } from 'react'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { SearchInput } from '@/components/common/ui/field'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { PagedList } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { SummaryTile } from '@/components/common/ui/summary-tile'
import { dispatchReasonLabel, dispatchStatusMeta } from '@/features/dispatch/dispatchDisplay'
import { formatAppointment, formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useDispatchQueueQuery } from '@/hooks/useDispatch'
import { ROUTES, withId } from '@/routes/paths'
import type { DispatchQueueItemView } from '@/types/res/dispatchRes'
import { fold } from '@/utils/fold'

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

const TAG_TONES = ['ok', 'info', 'warn', 'danger'] as const

const locationOf = (r: DispatchQueueItemView) =>
  [r.zone?.name ?? 'Chưa thuộc khu vực nào', r.province].filter(Boolean).join(', ')

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
  const customer = r.customerName || '—'
  return (
    <ListRow>
      <ListCells columns={COLUMNS}>
        <ListCell wide>
          <div className="flex items-start gap-3">
            <span className="sv-stat-icon size-10! shrink-0" aria-hidden>
              <Icon name="apartment" className="text-[20px]" />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-fg">{r.propertyName || 'Công trình chưa đặt tên'}</h2>
              <p className="mt-0.5 flex items-start gap-1 text-meta text-fg-2">
                <Icon name="location_on" className="mt-px shrink-0 text-[16px] text-fg-3" />
                <span>{locationOf(r)}</span>
              </p>
            </div>
          </div>
        </ListCell>
        <ListCell label="Khách hàng">
          <span className="flex items-center gap-2">
            <span className="sv-avatar-sm" aria-hidden>
              {customer.charAt(0).toUpperCase()}
            </span>
            {customer}
          </span>
        </ListCell>
        <ListCell label="Lý do">
          <span className="sv-reason">
            <Icon name="warning" className="mt-px shrink-0 text-[16px]" />
            {dispatchReasonLabel(r.reason)}
          </span>
        </ListCell>
        <ListCell label="Tình hình">
          <span className="sv-tag" data-tone={TAG_TONES.find((t) => t === status.tone) ?? 'neutral'} data-shape="pill">
            {status.label}
          </span>
          {r.status === 'PROPOSAL_PENDING' && r.liveProposal ? (
            <div className="mt-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-meta text-fg-2">
                  Đề xuất {formatAppointment(r.liveProposal.startsAt, r.liveProposal.endsAt)},{' '}
                  {r.liveProposal.technicianName}
                </span>
              </div>
              <p className="text-meta text-fg-2">Khách trả lời trước {formatMoment(r.liveProposal.expiresAt)}.</p>
            </div>
          ) : (
            text && <p className="mt-1 text-meta text-fg-2">{text}</p>
          )}
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
  const [keyword, setKeyword] = useState('')
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

  const key = fold(keyword.trim())
  const shown = key
    ? groups[tab].filter((r) =>
        fold(`${r.propertyName} ${r.customerName ?? ''} ${dispatchReasonLabel(r.reason)} ${locationOf(r)}`).includes(
          key,
        ),
      )
    : groups[tab]

  return (
    <div className="sv-list">
      <PageHeader
        title="Điều phối kỹ thuật viên"
        description="Xếp kỹ thuật viên cho các yêu cầu khảo sát chưa có người nhận lịch."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryTile
          label="Cần xếp ngay"
          count={todo.length}
          note={todo.length === 0 ? 'Tất cả đã xử lý' : 'Chờ xếp kỹ thuật viên'}
          icon="schedule"
          tone="warn"
          active={tab === 'todo'}
          onClick={() => setPicked('todo')}
        />
        <SummaryTile
          label="Chờ khách hẹn"
          count={waiting.length}
          note={waiting.length === 0 ? 'Không có tồn đọng' : 'Chờ khách trả lời đề xuất'}
          icon="calendar_month"
          tone="info"
          active={tab === 'waiting'}
          onClick={() => setPicked('waiting')}
        />
        <SummaryTile
          label="Quá hạn phản hồi"
          count={overdue}
          note={overdue === 0 ? 'Không có yêu cầu quá hạn' : 'Cần xử lý trước'}
          icon="error_outline"
          tone={overdue > 0 ? 'danger' : 'ok'}
        />
      </div>

      <div className="sv-card sv-flush">
        <FilterChips
          label="Lọc yêu cầu"
          className="px-4"
          value={tab}
          onChange={(next) => {
            setPicked(next)
            setKeyword('')
          }}
          chips={[
            { value: 'todo', label: 'Cần xếp', count: groups.todo.length },
            { value: 'waiting', label: 'Chờ khách', count: groups.waiting.length },
            { value: 'closed', label: 'Đã xong', count: done.data?.totalItems },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="w-full max-w-xl">
            <SearchInput
              name="dispatch-search"
              placeholder="Tìm theo tên công trình, khách hàng, lý do"
              maxLength={100}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onClear={() => setKeyword('')}
            />
          </div>
          <p className="tnum text-meta text-fg-2">
            Hiển thị: <b className="font-semibold text-fg">{shown.length}</b> hồ sơ điều phối
          </p>
        </div>
        <QueryBoundary query={query}>
          {() =>
            shown.length === 0 ? (
              <div className="px-4 pb-4">
                <EmptyState
                  {...(key
                    ? { title: 'Không tìm thấy yêu cầu phù hợp', description: 'Thử đổi từ khoá tìm kiếm.' }
                    : EMPTY[tab])}
                />
              </div>
            ) : (
              <PagedList key={`${tab}-${key}`} items={shown} noun="yêu cầu" keepScroll pagerClassName="px-4 pb-4">
                {(pageItems) => (
                  <div className="border-t border-line">
                    <div className="bg-surface-2 px-4">
                      <ListHead
                        columns={COLUMNS}
                        labels={['Công trình & địa chỉ', 'Khách hàng', 'Lý do điều phối', 'Tình hình', 'Thao tác']}
                      />
                    </div>
                    <ul className="divide-y divide-line border-t border-line px-4">
                      {pageItems.map((r) => (
                        <DispatchRow key={r.dispatchRequestId} row={r} detailPattern={detailPattern} />
                      ))}
                    </ul>
                  </div>
                )}
              </PagedList>
            )
          }
        </QueryBoundary>
      </div>
    </div>
  )
}

export function ManageDispatchRequestsPage() {
  return <DispatchRequestsPage detailPattern={ROUTES.manage.dispatchRequest} />
}

export function AdminDispatchRequestsPage() {
  return <DispatchRequestsPage detailPattern={ROUTES.admin.dispatchRequest} />
}
