import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { ActivityList, KeyValueList, Notice, type ActivityItem } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, Skeleton } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { CustomerDispatchPanel, DispatchOutcomeNotice } from '@/features/dispatch/CustomerDispatchPanel'
import { DispatchRequestForm } from '@/features/dispatch/DispatchRequestForm'
import { customerDispatchMeta, isActiveDispatch } from '@/features/dispatch/dispatchDisplay'
import { formatDateTime, shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { ContractLinkPanel } from '@/features/contracts/ContractLinkPanel'
import { RequestQuotationPanel } from '@/features/quotations/RequestQuotationPanel'
import { BookingPanel } from '@/features/scheduling/BookingPanel'
import { CancelBookingDialog } from '@/features/scheduling/CancelBookingDialog'
import { WithdrawRequestDialog } from '@/features/scheduling/WithdrawRequestDialog'
import {
  canBook,
  canWithdraw,
  customerProgress,
  formatAppointment,
  formatDay,
  formatTimeRange,
  historyStatusLabel,
  isClosedCustomerRequest,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import { useMyRequestQuery } from '@/hooks/useBooking'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { useMyDispatchQuery } from '@/hooks/useDispatch'
import { ROUTES } from '@/routes/paths'
import type { CustomerSurveyRequestDetailView, CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'

/* Một câu nói khách đang ở đâu và việc tiếp theo là của ai */
function describe(r: CustomerSurveyRequestView) {
  if (r.status === 'CLOSED') return 'Bộ phận kinh doanh đã đóng yêu cầu này.'
  const a = r.appointment
  if (!a) return undefined
  if (a.acceptanceStatus === 'WAITING_FOR_TECHNICIAN')
    return 'Kỹ thuật viên phụ trách khu vực của công trình sẽ nhận lịch, bạn sẽ thấy tên người tới khảo sát ở đây.'
  if (a.acceptanceStatus === 'NEEDS_STAFF') return 'Nhân viên đang xếp kỹ thuật viên cho giờ bạn đã đặt.'
  if (a.acceptanceStatus === 'CONFIRMED')
    return `Kỹ thuật viên ${a.assignedTechnicianName ?? ''} đã nhận lịch và sẽ tới khảo sát theo giờ bên dưới.`
  return undefined
}

/** `dispatchStatus`: khách đã nhờ Smart Solar xếp kỹ thuật viên (OPEN, PROPOSAL_PENDING), chưa có lịch */
function Progress({ r, dispatchStatus }: { r: CustomerSurveyRequestView; dispatchStatus?: string | null }) {
  const dispatching = dispatchStatus === 'OPEN' || dispatchStatus === 'PROPOSAL_PENDING'
  const a = r.appointment
  const confirmed = a?.acceptanceStatus === 'CONFIRMED' || a?.acceptanceStatus === 'COMPLETED'
  const completed = r.status === 'COMPLETED'
  // Yêu cầu đã đóng thì không còn bước nào đang làm
  const closed = isClosedCustomerRequest(r)
  const items: ActivityItem[] = [
    { title: 'Gửi yêu cầu', time: formatDateTime(r.submittedAt), state: 'done' },
    {
      title: 'Đặt giờ khảo sát',
      time: a
        ? formatDateTime(a.bookedAt)
        : dispatchStatus === 'PROPOSAL_PENDING'
          ? 'Chờ bạn xác nhận giờ đề xuất'
          : dispatching
            ? 'Smart Solar đang xếp kỹ thuật viên'
            : 'Chưa đặt',
      state: a ? 'done' : 'current',
    },
    {
      title: 'Kỹ thuật viên nhận lịch',
      time: confirmed
        ? (a?.assignedTechnicianName ?? 'Đã nhận')
        : a
          ? 'Đang chờ'
          : dispatching
            ? 'Sau khi có giờ khảo sát'
            : 'Sau khi bạn đặt giờ',
      state: confirmed ? 'done' : a ? 'current' : 'todo',
    },
    {
      title: 'Khảo sát tại công trình',
      time: a ? formatAppointment(a.startsAt, a.endsAt) : '—',
      state: completed ? 'done' : confirmed ? 'current' : 'todo',
    },
  ]
  return (
    <ActivityList
      items={closed ? items.map((item) => (item.state === 'current' ? { ...item, state: 'todo' } : item)) : items}
    />
  )
}

function AppointmentPanel({
  r,
  onReschedule,
  onCancel,
}: {
  r: CustomerSurveyRequestView
  onReschedule: () => void
  onCancel: () => void
}) {
  const a = r.appointment!
  return (
    <Panel>
      <PanelHeader
        title="Lịch khảo sát"
        action={
          a.canCustomerChange ? (
            <>
              <Button size="sm" variant="soft" icon="edit_calendar" onClick={onReschedule}>
                Đổi giờ
              </Button>
              <Button size="sm" variant="danger" icon="event_busy" onClick={onCancel}>
                Huỷ lịch
              </Button>
            </>
          ) : undefined
        }
      />
      <PanelBody className="space-y-4">
        <div>
          <p className="text-title font-semibold text-fg">{formatDay(vnDate(a.startsAt), { year: true })}</p>
          <p className="tnum text-figure font-semibold text-fg">{formatTimeRange(a.startsAt, a.endsAt)}</p>
        </div>
        <KeyValueList
          items={[
            { k: 'Kỹ thuật viên', v: a.assignedTechnicianName ?? 'Đang chờ kỹ thuật viên nhận' },
            { k: 'Ghi chú của bạn', v: a.customerNote || '—' },
            { k: 'Đặt lúc', v: formatDateTime(a.bookedAt) },
          ]}
        />
        {!a.canCustomerChange && (
          <Notice tone="info">
            Lịch đã sát giờ hẹn nên bạn không tự đổi hoặc huỷ được. Cần đổi, hãy liên hệ bộ phận kinh doanh.
          </Notice>
        )}
      </PanelBody>
    </Panel>
  )
}

function History({ items }: { items: CustomerSurveyRequestDetailView['history'] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((h) => (
        <li key={h.appointmentId} className="py-2 first:pt-0 last:pb-0">
          <p className="text-body text-fg">{formatAppointment(h.startsAt, h.endsAt)}</p>
          <p className="text-meta text-fg-2">
            {historyStatusLabel(h.status)}, đặt lúc {formatDateTime(h.bookedAt)}
          </p>
        </li>
      ))}
    </ul>
  )
}

// Chi tiết yêu cầu khảo sát của khách: đặt giờ, đổi giờ / huỷ khi còn chờ phân công
// Đã phân công thì chỉ xem, muốn đổi phải qua kinh doanh
export function CustomerRequestPage() {
  const { id } = useParams()
  const query = useMyRequestQuery(id)
  const contracts = useMyContractsQuery()
  const [rescheduling, setRescheduling] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  // Chưa có lịch thì xem khách có đang nhờ Smart Solar xếp kỹ thuật viên không
  const dispatch = useMyDispatchQuery(id, { enabled: Boolean(query.data && canBook(query.data.request)) })
  const [dispatchForm, setDispatchForm] = useState<{ coverage: string | null; date: string } | null>(null)
  // Nhân viên phân công thẳng: yêu cầu điều phối sang ASSIGNED trước khi chi tiết yêu cầu kịp tải lại lịch mới
  const assignedNow = Boolean(query.data && canBook(query.data.request) && dispatch.data?.status === 'ASSIGNED')
  const { refetch } = query
  useEffect(() => {
    if (assignedNow) void refetch()
  }, [assignedNow, refetch])
  usePageCrumb(query.data ? query.data.request.propertyName || 'Công trình chưa đặt tên' : null)

  return (
    <QueryBoundary query={query}>
      {({ request: r, history }) => {
        const d = canBook(r) ? dispatch.data : undefined
        const dispatchActive = Boolean(d && isActiveDispatch(d.status))
        const progress = d && dispatchActive ? customerDispatchMeta(d) : customerProgress(r)
        const a = r.appointment
        // Đã có hợp đồng thì không rút được nữa; chờ tải xong danh sách hợp đồng mới hiện nút
        const withdrawable =
          canWithdraw(r) &&
          contracts.data !== undefined &&
          !contracts.data.some((c) => c.surveyRequestId === r.surveyRequestId)
        // Đổi giờ chỉ khi lịch còn đổi được (refetch có thể vừa chuyển sang ASSIGNED).
        const showReschedule = rescheduling && Boolean(a?.canCustomerChange)
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={progress.tone}>{progress.label}</Badge>
                  <span className="tnum">Mã {shortCode(r.surveyRequestId)}</span>
                </>
              }
              title={r.propertyName || 'Công trình chưa đặt tên'}
              description={describe(r)}
              actions={
                withdrawable ? (
                  <Button variant="danger" icon="cancel" onClick={() => setWithdrawing(true)}>
                    Rút yêu cầu
                  </Button>
                ) : undefined
              }
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                <RequestQuotationPanel surveyRequestId={r.surveyRequestId} />
                <ContractLinkPanel surveyRequestId={r.surveyRequestId} />
                {isClosedCustomerRequest(r) ? (
                  <EmptyState
                    title="Yêu cầu này đã đóng"
                    description="Yêu cầu đã đóng không mở lại được. Muốn khảo sát lại, gửi đánh giá mới cho công trình."
                    action={
                      <ButtonLink icon="add" variant="primary" to={ROUTES.customer.assessment}>
                        Gửi đánh giá mới
                      </ButtonLink>
                    }
                  />
                ) : canBook(r) ? (
                  dispatch.isPending || (assignedNow && query.isFetching) ? (
                    <Skeleton className="h-64" />
                  ) : d && dispatchActive ? (
                    <CustomerDispatchPanel dispatch={d} />
                  ) : dispatchForm ? (
                    <DispatchRequestForm
                      surveyRequestId={r.surveyRequestId}
                      coverageStatus={dispatchForm.coverage}
                      startDate={dispatchForm.date}
                      onCancel={() => setDispatchForm(null)}
                      onDone={() => setDispatchForm(null)}
                    />
                  ) : (
                    <div className="space-y-4">
                      {d && <DispatchOutcomeNotice dispatch={d} />}
                      <BookingPanel
                        surveyRequestId={r.surveyRequestId}
                        propertySiteId={r.propertySiteId}
                        onRequestDispatch={(coverage, date) => setDispatchForm({ coverage, date })}
                      />
                    </div>
                  )
                ) : a ? (
                  showReschedule ? (
                    <BookingPanel
                      surveyRequestId={r.surveyRequestId}
                      propertySiteId={r.propertySiteId}
                      current={a}
                      onCancel={() => setRescheduling(false)}
                      onDone={() => setRescheduling(false)}
                    />
                  ) : (
                    <AppointmentPanel
                      r={r}
                      onReschedule={() => setRescheduling(true)}
                      onCancel={() => setCancelling(true)}
                    />
                  )
                ) : (
                  <EmptyState
                    title="Yêu cầu này không còn đặt lịch được"
                    description="Liên hệ bộ phận kinh doanh nếu bạn cần khảo sát lại."
                  />
                )}
              </div>

              <PanelAside aria-label="Tiến độ và lịch sử">
                <Panel>
                  <PanelHeader title="Tiến độ" />
                  <PanelBody>
                    <Progress r={r} dispatchStatus={dispatchActive ? d?.status : null} />
                  </PanelBody>
                </Panel>
                {/* Chỉ hiện khi có lần đặt khác lịch đang hiệu lực (đã huỷ / đã đổi giờ). */}
                {history.length > (a ? 1 : 0) && (
                  <Panel>
                    <PanelHeader title="Các lần đặt giờ" />
                    <PanelBody>
                      <History items={history} />
                    </PanelBody>
                  </Panel>
                )}
              </PanelAside>
            </div>

            {withdrawable && (
              <WithdrawRequestDialog
                surveyRequestId={r.surveyRequestId}
                propertyName={r.propertyName || 'này'}
                open={withdrawing}
                onOpenChange={setWithdrawing}
              />
            )}
            {a?.canCustomerChange && (
              <CancelBookingDialog
                surveyRequestId={r.surveyRequestId}
                appointment={a}
                open={cancelling}
                onOpenChange={setCancelling}
              />
            )}
          </>
        )
      }}
    </QueryBoundary>
  )
}
