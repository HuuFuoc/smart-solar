import { useState } from 'react'
import { useParams } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { ActivityList, KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { formatDateTime, shortCode } from '@/features/pre-surveys/components/preSurveyDisplay'
import { BookingPanel } from '@/features/scheduling/components/BookingPanel'
import { CancelBookingDialog } from '@/features/scheduling/components/CancelBookingDialog'
import {
  canBook,
  customerProgress,
  formatAppointment,
  formatDay,
  formatTimeRange,
  historyStatusLabel,
  vnDate,
} from '@/features/scheduling/components/schedulingDisplay'
import { useMyRequestQuery } from '@/hooks/useBooking'
import type { CustomerSurveyRequestDetailView, CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'

/* Một câu nói khách đang ở đâu và việc tiếp theo là của ai. */
function describe(r: CustomerSurveyRequestView) {
  const a = r.appointment
  if (canBook(r)) return 'Chọn ngày giờ để kỹ thuật viên tới khảo sát công trình.'
  if (!a) return undefined
  if (a.status === 'BOOKED') return 'Bộ phận kinh doanh sẽ phân công kỹ thuật viên cho giờ bạn đã đặt.'
  if (a.status === 'ASSIGNED') return `Kỹ thuật viên ${a.assignedTechnicianName ?? ''} sẽ tới khảo sát theo lịch bên dưới.`
  if (a.status === 'ACKNOWLEDGED') return `Kỹ thuật viên ${a.assignedTechnicianName ?? ''} đã nhận việc và sẽ tới theo lịch bên dưới.`
  return undefined
}

function Progress({ r }: { r: CustomerSurveyRequestView }) {
  const a = r.appointment
  const assigned = a?.technicianAssigned ?? false
  const acknowledged = a?.status === 'ACKNOWLEDGED'
  const completed = r.status === 'COMPLETED'
  return (
    <ActivityList
      items={[
        { title: 'Gửi yêu cầu', time: formatDateTime(r.submittedAt), state: 'done' },
        { title: 'Đặt giờ khảo sát', time: a ? formatDateTime(a.bookedAt) : 'Chưa đặt', state: a ? 'done' : 'current' },
        {
          title: 'Phân công kỹ thuật viên',
          time: assigned ? (a?.assignedTechnicianName ?? 'Đã phân công') : 'Sau khi bạn đặt giờ',
          state: assigned ? 'done' : a ? 'current' : 'todo',
        },
        { title: 'Kỹ thuật viên nhận việc', time: acknowledged ? 'Đã nhận' : '—', state: acknowledged ? 'done' : assigned ? 'current' : 'todo' },
        {
          title: 'Khảo sát tại công trình',
          time: a ? formatAppointment(a.startsAt, a.endsAt) : '—',
          state: completed ? 'done' : acknowledged ? 'current' : 'todo',
        },
      ]}
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
              <Button size="sm" icon="edit_calendar" onClick={onReschedule}>
                Đổi giờ
              </Button>
              <Button size="sm" variant="danger-quiet" icon="event_busy" onClick={onCancel}>
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
            { k: 'Kỹ thuật viên', v: a.assignedTechnicianName ?? 'Đang chờ phân công' },
            { k: 'Ghi chú của bạn', v: a.customerNote || '—' },
            { k: 'Đặt lúc', v: formatDateTime(a.bookedAt) },
          ]}
        />
        {!a.canCustomerChange && a.technicianAssigned && (
          <Notice tone="info">Kỹ thuật viên đã được phân công nên bạn không tự đổi giờ được. Cần đổi, hãy liên hệ bộ phận kinh doanh.</Notice>
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

/*
  Chi tiết một yêu cầu khảo sát của khách: đặt giờ khi chưa có lịch, đổi giờ / huỷ khi lịch còn chờ phân công, chỉ xem
  khi kỹ thuật viên đã được phân công (khi đó muốn đổi phải qua kinh doanh). Không hiện kỹ thuật viên hệ thống đang giữ chỗ.
*/
export function CustomerRequestPage() {
  const { id } = useParams()
  const query = useMyRequestQuery(id)
  const [rescheduling, setRescheduling] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  usePageCrumb(query.data ? query.data.request.propertyName || 'Công trình chưa đặt tên' : null)

  return (
    <QueryBoundary query={query}>
      {({ request: r, history }) => {
        const progress = customerProgress(r)
        const a = r.appointment
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
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                {canBook(r) ? (
                  <BookingPanel surveyRequestId={r.surveyRequestId} propertySiteId={r.propertySiteId} />
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
                    <AppointmentPanel r={r} onReschedule={() => setRescheduling(true)} onCancel={() => setCancelling(true)} />
                  )
                ) : (
                  <EmptyState title="Yêu cầu này không còn đặt lịch được" description="Liên hệ bộ phận kinh doanh nếu bạn cần khảo sát lại." />
                )}
              </div>

              <PanelAside aria-label="Tiến độ và lịch sử">
                <Panel>
                  <PanelHeader title="Tiến độ" />
                  <PanelBody>
                    <Progress r={r} />
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

            {a?.canCustomerChange && (
              <CancelBookingDialog surveyRequestId={r.surveyRequestId} appointment={a} open={cancelling} onOpenChange={setCancelling} />
            )}
          </>
        )
      }}
    </QueryBoundary>
  )
}
