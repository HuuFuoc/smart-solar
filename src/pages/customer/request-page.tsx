import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { Tone } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { PanelAside } from '@/components/common/ui/panel'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { CustomerDispatchPanel, DispatchOutcomeNotice } from '@/features/dispatch/CustomerDispatchPanel'
import { DispatchRequestForm } from '@/features/dispatch/DispatchRequestForm'
import { customerDispatchMeta, isActiveDispatch } from '@/features/dispatch/dispatchDisplay'
import { AppointmentCard } from '@/features/pre-surveys/components/AppointmentCard'
import { ProgressTimeline, type ProgressStep } from '@/features/pre-surveys/components/ProgressTimeline'
import { RelatedDocuments } from '@/features/pre-surveys/components/RelatedDocuments'
import { StatusBadge } from '@/features/pre-surveys/components/StatusBadge'
import { formatDateTime, shortCode } from '@/features/pre-surveys/preSurveyDisplay'
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
import { isApiError } from '@/services/api/errors'
import type { CustomerSurveyRequestDetailView, CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { CustomerDispatchView } from '@/types/res/dispatchRes'

/** Chuyển trạng thái sang bảng màu xanh thương hiệu + xám trung tính; chỉ dùng warn/danger khi cần chú ý gấp. */
function requestBadgeMeta(
  r: CustomerSurveyRequestView,
  d: CustomerDispatchView | null | undefined,
): { label: string; tone: Tone; icon: string } {
  const dispatchActive = Boolean(d && isActiveDispatch(d.status))
  const raw = d && dispatchActive ? customerDispatchMeta(d) : customerProgress(r)

  if (d?.status === 'PROPOSAL_PENDING') {
    return { label: raw.label, tone: 'warn', icon: 'notification_important' }
  }
  if (d?.status === 'OPEN') {
    return { label: raw.label, tone: 'neutral', icon: 'hourglass_top' }
  }
  if (canBook(r)) {
    return { label: raw.label, tone: 'accent', icon: 'calendar_month' }
  }
  if (r.status === 'COMPLETED') {
    return { label: raw.label, tone: 'ok', icon: 'task_alt' }
  }
  if (isClosedCustomerRequest(r)) {
    return { label: raw.label, tone: 'neutral', icon: 'archive' }
  }
  if (r.appointment?.acceptanceStatus === 'CONFIRMED') {
    return { label: raw.label, tone: 'ok', icon: 'check_circle' }
  }
  return { label: raw.label, tone: 'neutral', icon: 'hourglass_top' }
}

/** Tạo danh sách bước cho ProgressTimeline dùng chung mọi trạng thái của yêu cầu khảo sát. */
function buildProgressSteps(r: CustomerSurveyRequestView, dispatchStatus?: string | null): ProgressStep[] {
  const dispatching = dispatchStatus === 'OPEN' || dispatchStatus === 'PROPOSAL_PENDING'
  const a = r.appointment
  const confirmed = a?.acceptanceStatus === 'CONFIRMED' || a?.acceptanceStatus === 'COMPLETED'
  const completed = r.status === 'COMPLETED'
  const closed = isClosedCustomerRequest(r)

  const steps: ProgressStep[] = [
    {
      label: 'Gửi yêu cầu',
      detail: formatDateTime(r.submittedAt),
      state: 'done',
    },
    {
      label: 'Đặt giờ khảo sát',
      detail: a
        ? formatDateTime(a.bookedAt)
        : dispatchStatus === 'PROPOSAL_PENDING'
          ? 'Chờ bạn xác nhận giờ đề xuất'
          : dispatching
            ? 'Đang xếp kỹ thuật viên'
            : 'Chưa đặt',
      state: a ? 'done' : 'current',
    },
    {
      label: 'Kỹ thuật viên nhận lịch',
      detail: confirmed
        ? (a?.assignedTechnicianName ?? 'Đã phân công')
        : a
          ? 'Đang chờ kỹ thuật viên'
          : dispatching
            ? 'Sau khi có giờ khảo sát'
            : 'Sau khi bạn đặt giờ',
      state: confirmed ? 'done' : a ? 'current' : 'todo',
    },
    {
      label: 'Khảo sát tại công trình',
      detail: a
        ? `${formatDay(vnDate(a.startsAt), { year: true })} · ${formatTimeRange(a.startsAt, a.endsAt)}`
        : undefined,
      state: completed ? 'done' : confirmed ? 'current' : 'todo',
    },
  ]

  return closed ? steps.map((step) => (step.state === 'current' ? { ...step, state: 'todo' } : step)) : steps
}

function HistoryList({ items }: { items: CustomerSurveyRequestDetailView['history'] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((h) => (
        <li key={h.appointmentId} className="py-2 first:pt-0 last:pb-0">
          <p className="tnum text-body text-fg">{formatAppointment(h.startsAt, h.endsAt)}</p>
          <p className="tnum text-meta text-fg-2">
            {historyStatusLabel(h.status)} · đặt lúc {formatDateTime(h.bookedAt)}
          </p>
        </li>
      ))}
    </ul>
  )
}

function RequestDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải chi tiết yêu cầu khảo sát" className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <span aria-hidden className="text-fg-3/50">
            /
          </span>
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-6 w-36 rounded-full" />
        </div>
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-52 w-full rounded-container" />
          <Skeleton className="h-32 w-full rounded-container" />
        </div>
        <Skeleton className="h-72 w-full rounded-container" />
      </div>
    </div>
  )
}

function RequestLoadFailure({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const notFound = isApiError(error) && (error.status === 404 || error.code === 'SURVEY_REQUEST_NOT_FOUND')
  const forbidden = isApiError(error) && error.status === 403
  const retryable = !(isApiError(error) && error.status >= 400 && error.status < 500)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Yêu cầu khảo sát', to: ROUTES.customer.requests },
          { label: notFound ? 'Không tìm thấy' : 'Chi tiết yêu cầu' },
        ]}
        title={notFound ? 'Không tìm thấy yêu cầu khảo sát' : 'Chi tiết yêu cầu khảo sát'}
        className="mb-2"
      />

      {notFound ? (
        <EmptyState
          title="Không tìm thấy yêu cầu này"
          description="Yêu cầu khảo sát có thể đã bị xoá hoặc đường dẫn bạn truy cập không tồn tại."
          action={
            <ButtonLink to={ROUTES.customer.requests} variant="primary" icon="arrow_back">
              Quay về danh sách yêu cầu
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-4">
          <ErrorState
            title={forbidden ? 'Bạn không có quyền xem yêu cầu này.' : 'Không tải được yêu cầu khảo sát.'}
            message={isApiError(error) ? error.message : undefined}
            onRetry={retryable ? onRetry : undefined}
          />
          <div>
            <ButtonLink to={ROUTES.customer.requests} variant="secondary" icon="arrow_back" size="sm">
              Quay về danh sách yêu cầu
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
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

  const propertyTitle = query.data ? query.data.request.propertyName || 'Công trình chưa đặt tên' : null
  usePageCrumb(propertyTitle, { hideBack: true })

  if (query.isPending) return <RequestDetailSkeleton />
  if (query.data === undefined) return <RequestLoadFailure error={query.error} onRetry={() => void query.refetch()} />

  const { request: r, history } = query.data
  const d = canBook(r) ? dispatch.data : undefined
  const dispatchActive = Boolean(d && isActiveDispatch(d.status))
  const badge = requestBadgeMeta(r, d)
  const a = r.appointment
  // Đã có hợp đồng thì không rút được nữa; chờ tải xong danh sách hợp đồng mới hiện nút
  const withdrawable =
    canWithdraw(r) &&
    contracts.data !== undefined &&
    !contracts.data.some((c) => c.surveyRequestId === r.surveyRequestId)
  // Đổi giờ chỉ khi lịch còn đổi được (refetch có thể vừa chuyển sang ASSIGNED).
  const showReschedule = rescheduling && Boolean(a?.canCustomerChange)
  const requestName = r.propertyName || 'Công trình chưa đặt tên'
  const steps = buildProgressSteps(r, dispatchActive ? d?.status : null)

  return (
    <>
      {query.isError && (
        <div role="status" className="mb-4">
          <Notice tone="warn">
            Không làm mới được dữ liệu, đang hiện bản tải lúc trước.{' '}
            <button type="button" className="tap ui-link font-medium" onClick={() => void query.refetch()}>
              Thử lại
            </button>
          </Notice>
        </div>
      )}

      <PageHeader
        className="mb-6"
        breadcrumb={[{ label: 'Yêu cầu khảo sát', to: ROUTES.customer.requests }, { label: requestName }]}
        title={requestName}
        titleBadge={<StatusBadge label={badge.label} tone={badge.tone} icon={badge.icon} />}
        subtitle={<span className="tnum">Mã {shortCode(r.surveyRequestId)}</span>}
        actions={
          withdrawable ? (
            <Button variant="danger" icon="cancel" onClick={() => setWithdrawing(true)}>
              Rút yêu cầu
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="min-w-0 space-y-4 lg:col-span-2">
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
              <Skeleton className="h-56" />
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
              <AppointmentCard
                request={r}
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

          <RelatedDocuments surveyRequestId={r.surveyRequestId} />
        </div>

        <PanelAside className="w-full lg:sticky lg:top-6" aria-label="Tiến độ và lịch sử">
          <ProgressTimeline steps={steps} />
          {/* Chỉ hiện khi có lần đặt khác lịch đang hiệu lực (đã huỷ / đã đổi giờ). */}
          {history.length > (a ? 1 : 0) && (
            <div className="border-t border-line pt-4">
              <h3 className="mb-3 text-body font-semibold text-fg">Các lần đặt giờ</h3>
              <HistoryList items={history} />
            </div>
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
}
