import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips, type Chip } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, Skeleton } from '@/components/common/ui/states'
import { StatusTableSection } from '@/components/common/ui/status-tables'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { customerRequestProgress, customerRequestTodo } from '@/features/dispatch/dispatchDisplay'
import { formatRelative, shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatAppointment, formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useMyDispatchesQuery } from '@/hooks/useDispatch'
import { ROUTES, withId } from '@/routes/paths'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { CustomerDispatchView } from '@/types/res/dispatchRes'

type Row = { r: CustomerSurveyRequestView; d: CustomerDispatchView | undefined }
type FilterTab = 'all' | 'to-book' | 'dispatching' | 'confirmed'

// Nhóm chỉ có một tình hình (cần đặt giờ, đã có lịch) thì bỏ cột Tình hình vì tiêu đề nhóm đã nói
function RequestTable({ rows, showStatus }: { rows: Row[]; showStatus: boolean }) {
  return (
    <Table stack>
      <thead>
        <tr>
          <Th>Công trình</Th>
          <Th>Gửi lúc</Th>
          <Th>Lịch khảo sát</Th>
          {showStatus && <Th>Tình hình</Th>}
          <Th className="w-px">
            <span className="sr-only">Thao tác</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ r, d }) => {
          const a = r.appointment
          const live = d?.status === 'PROPOSAL_PENDING' ? d.liveProposal : null
          const todo = customerRequestTodo(r, d)
          const progress = customerRequestProgress(r, d)
          return (
            <Tr key={r.surveyRequestId} className="*:align-middle">
              <Td label="Công trình">
                <p className="font-semibold">{r.propertyName || 'Công trình chưa đặt tên'}</p>
                <p className="tnum text-meta text-fg-2">Mã {shortCode(r.surveyRequestId)}</p>
              </Td>
              <Td label="Gửi lúc" className="whitespace-nowrap">
                {formatRelative(r.submittedAt)}
              </Td>
              <Td label="Lịch khảo sát">
                {live ? (
                  <>
                    <p className="tnum">Đề xuất {formatAppointment(live.startsAt, live.endsAt)}</p>
                    <p className="tnum text-meta text-fg-2">Trả lời trước {formatMoment(live.expiresAt)}</p>
                  </>
                ) : a ? (
                  <>
                    <p className="tnum">{formatAppointment(a.startsAt, a.endsAt)}</p>
                    {a.assignedTechnicianName && (
                      <p className="text-meta text-fg-2">Kỹ thuật viên {a.assignedTechnicianName}</p>
                    )}
                  </>
                ) : (
                  <span className="text-fg-2">Chưa có</span>
                )}
              </Td>
              {showStatus && (
                <Td label="Tình hình">
                  <Badge tone={progress.tone}>{progress.label}</Badge>
                </Td>
              )}
              <Td className="whitespace-nowrap lg:text-right">
                <ButtonLink
                  to={withId(ROUTES.customer.request, r.surveyRequestId)}
                  size="sm"
                  variant={todo ? 'soft' : 'info'}
                  icon={todo ? 'calendar_month' : 'visibility'}
                >
                  {live ? 'Xem giờ đề xuất' : todo ? 'Đặt giờ khảo sát' : 'Xem yêu cầu'}
                </ButtonLink>
              </Td>
            </Tr>
          )
        })}
      </tbody>
    </Table>
  )
}

export function CustomerRequestsPage() {
  const query = useMyRequestsQuery()
  const { dispatches, pending } = useMyDispatchesQuery(query.data)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const rows: Row[] = pending ? [] : (query.data ?? []).map((r) => ({ r, d: dispatches.get(r.surveyRequestId) }))

  const toBookRows = rows.filter(({ r, d }) => customerRequestTodo(r, d))
  const dispatchingRows = rows.filter(
    ({ r, d }) =>
      !customerRequestTodo(r, d) &&
      (d?.status === 'OPEN' ||
        (r.appointment && ['WAITING_FOR_TECHNICIAN', 'NEEDS_STAFF'].includes(r.appointment.acceptanceStatus))),
  )
  const confirmedRows = rows.filter(
    ({ r, d }) => !customerRequestTodo(r, d) && r.appointment?.acceptanceStatus === 'CONFIRMED',
  )
  const otherRows = rows.filter(
    (row) => !toBookRows.includes(row) && !dispatchingRows.includes(row) && !confirmedRows.includes(row),
  )

  const toConfirmCount = rows.filter(({ d }) => d?.status === 'PROPOSAL_PENDING').length
  const toBookCount = toBookRows.length - toConfirmCount

  const filterChips: Chip<FilterTab>[] = [
    { value: 'all', label: 'Tất cả', count: rows.length },
    { value: 'to-book', label: 'Cần đặt giờ', count: toBookRows.length },
    { value: 'dispatching', label: 'Đang xếp kỹ thuật viên', count: dispatchingRows.length },
    { value: 'confirmed', label: 'Đã có lịch', count: confirmedRows.length },
  ]

  // Nhóm trống chỉ hiện khi đang lọc đúng nhóm đó. Việc cần làm đã báo đỏ ở menu và đầu trang nên số ở đây xám
  const sections = [
    {
      key: 'to-book',
      title: 'Cần đặt giờ',
      rows: toBookRows,
      single: true,
      empty: 'Không có yêu cầu nào cần đặt giờ.',
    },
    { key: 'dispatching', title: 'Đang xếp kỹ thuật viên', rows: dispatchingRows, empty: 'Không có yêu cầu nào.' },
    { key: 'confirmed', title: 'Đã có lịch khảo sát', rows: confirmedRows, single: true, empty: 'Chưa có lịch nào.' },
    { key: 'other', title: 'Đã khảo sát, đã đóng', rows: otherRows, empty: '', closed: true },
  ].filter((s) => (activeTab === 'all' ? s.rows.length > 0 : s.key === activeTab))

  return (
    <>
      <PageHeader
        title="Yêu cầu khảo sát"
        description={
          toConfirmCount > 0 ? (
            <Badge tone="danger">{toConfirmCount} đề xuất giờ khảo sát chờ bạn xác nhận</Badge>
          ) : toBookCount > 0 ? (
            <Badge tone="danger">{toBookCount} yêu cầu chưa đặt giờ khảo sát</Badge>
          ) : undefined
        }
        actions={
          <ButtonLink to={ROUTES.customer.assessment} variant="primary" icon="add_location_alt">
            Đánh giá địa điểm khác
          </ButtonLink>
        }
      />

      <QueryBoundary query={query}>
        {(requests) =>
          pending ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-72" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              title="Chưa có yêu cầu khảo sát"
              action={
                <ButtonLink icon="play_arrow" to={ROUTES.customer.assessment} variant="primary">
                  Bắt đầu đánh giá sơ bộ
                </ButtonLink>
              }
            />
          ) : (
            <div className="space-y-4">
              <FilterChips
                chips={filterChips}
                value={activeTab}
                onChange={setActiveTab}
                label="Lọc theo trạng thái yêu cầu"
              />
              {sections.map((s) => (
                <StatusTableSection
                  key={s.key}
                  title={s.title}
                  count={s.rows.length}
                  emptyText={s.empty}
                  defaultOpen={!s.closed}
                >
                  <RequestTable rows={s.rows} showStatus={!s.single} />
                </StatusTableSection>
              ))}
            </div>
          )
        }
      </QueryBoundary>
    </>
  )
}
