import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { CUSTOMER_CLAIM_STATUSES, DISASTER_TYPES } from '@/common/afterSales'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { KeyValueList, Notice, type KV } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker, type TrackerNext } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { CustomerQuotationPanel } from '@/features/after-sales/CustomerQuotationPanel'
import {
  BOOKING_LEAD_DAYS,
  CHANGE_LEAD_HOURS,
  canReportFaultFromMaintenance,
  canRequestReconsideration,
  canReschedule,
  entitlementDeadline,
  entitlementOf,
  maintenanceFinding,
  rescheduleDeadline,
  rescheduleTooLate,
} from '@/features/after-sales/customerServiceRules'
import { MaintenanceFaultDialog } from '@/features/after-sales/MaintenanceFaultDialog'
import { PreferredTimeDialog } from '@/features/after-sales/PreferredTimeDialog'
import { ReconsiderationDialog } from '@/features/after-sales/ReconsiderationDialog'
import { ReasonDialog } from '@/features/after-sales/ReasonDialog'
import { ServicePhotos } from '@/features/after-sales/ServicePhotos'
import { QuotationDetail, ServiceItemList, ServiceVisitList } from '@/features/after-sales/ServiceRequestParts'
import {
  customerCanCancel,
  lastReport,
  openQuotation,
  openVisit,
  outcomeLabel,
  installationWarrantyText,
  requestKindLabel,
  requestTrackerSteps,
  requestStatusMeta,
  visitAwaitingCustomer,
  visitPurposeLabel,
} from '@/features/after-sales/serviceDisplay'
import { formatDateOnly } from '@/features/installations/installationDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatAppointment, formatMoment, vnDate } from '@/features/scheduling/schedulingDisplay'
import { useSubscriptionsQuery } from '@/hooks/useCustomerAfterSales'
import {
  useCancelRequestMutation,
  useCompletionMutation,
  useConfirmAppointmentMutation,
  useMyServiceRequestQuery,
  useRescheduleRequestMutation,
} from '@/hooks/useCustomerServiceRequests'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import { getEvidenceUrl } from '@/services/customerAfterSalesService'
import type { ServiceRequestView } from '@/types/res/customerAfterSalesRes'

// Đỏ khi khách phải làm, xanh dương khi chờ Smart Solar, xanh lá khi đã ổn
function nextStep(r: ServiceRequestView): TrackerNext {
  const visit = openVisit(r)
  const quotation = openQuotation(r)
  if (r.status === 'COMPLETED')
    return {
      tone: 'ok',
      title: 'Đã hoàn thành',
      body: [
        r.outcome && outcomeLabel(r.outcome),
        r.repairWarrantyEndsAt && `Phần sửa được bảo hành đến ${formatDateOnly(vnDate(r.repairWarrantyEndsAt))}`,
      ]
        .filter(Boolean)
        .join('. '),
    }
  if (r.status === 'CANCELLED')
    return { tone: 'neutral', title: 'Yêu cầu đã huỷ', body: r.cancellationReason ?? undefined }
  if (r.status === 'NOT_COMPLETED')
    return { tone: 'neutral', title: 'Không hoàn thành', body: r.outcome ? outcomeLabel(r.outcome) : undefined }
  if (r.status === 'CLOSED_DUPLICATE') return { tone: 'neutral', title: 'Đã gộp vào một yêu cầu khác của bạn' }
  if (r.cancellationRequestedAt)
    return { tone: 'info', title: 'Quản lý đang xét yêu cầu huỷ của bạn', body: r.cancellationReason ?? undefined }
  if (visitAwaitingCustomer(r))
    return {
      tone: 'danger',
      title: 'Bạn cần xác nhận lịch hẹn',
      body: 'Giờ hẹn khác giờ bạn chọn.',
      action: { label: 'Xem lịch hẹn', icon: 'event', target: 'confirm-visit' },
    }
  if (quotation?.status === 'ISSUED')
    return {
      tone: 'danger',
      title: 'Bạn cần duyệt báo giá',
      body: 'Đồng ý thì thanh toán để kỹ thuật viên tới làm.',
      action: { label: 'Xem báo giá', icon: 'request_quote', target: 'quotation' },
    }
  if (quotation?.status === 'ACCEPTED')
    return {
      tone: 'danger',
      title: 'Bạn cần thanh toán báo giá',
      body: 'Thanh toán xong Smart Solar sẽ xếp lịch.',
      action: { label: 'Thanh toán', icon: 'payments', target: 'quotation' },
    }
  switch (r.status) {
    case 'PENDING_CUSTOMER_ACCEPTANCE':
      return {
        tone: 'danger',
        title: 'Bạn cần nghiệm thu',
        body: 'Đọc báo cáo của kỹ thuật viên rồi chọn Đồng ý kết quả hoặc Chưa đạt.',
        action: { label: 'Nghiệm thu', icon: 'fact_check', target: 'acceptance' },
      }
    case 'SUBMITTED':
      return { tone: 'info', title: 'Smart Solar đang xếp kỹ thuật viên', body: 'Lịch hẹn hiện ở đây khi đã xếp xong.' }
    case 'SCHEDULED':
      if (!visit) return { tone: 'info', title: 'Đã có lịch hẹn' }
      return visit.assignmentStatus === 'ACCEPTED'
        ? {
            tone: 'ok',
            title: `${visit.technicianName ?? 'Kỹ thuật viên'} sẽ tới ${visitPurposeLabel(visit.purpose).toLowerCase()}`,
            body: formatAppointment(visit.startsAt, visit.endsAt),
          }
        : {
            tone: 'info',
            title: 'Chờ kỹ thuật viên nhận lịch',
            body: formatAppointment(visit.startsAt, visit.endsAt),
          }
    case 'IN_PROGRESS':
      return { tone: 'info', title: 'Kỹ thuật viên đang làm tại công trình' }
    case 'AWAITING_DECISION':
      return { tone: 'info', title: 'Smart Solar đang xét lỗi nào được bảo hành' }
    case 'AWAITING_QUOTATION':
      return { tone: 'info', title: 'Smart Solar đang lập báo giá', body: 'Báo giá hiện ở đây để bạn duyệt.' }
    case 'READY_FOR_WORK':
      return { tone: 'info', title: 'Smart Solar đang xếp lịch làm' }
    case 'DISPUTED':
      return { tone: 'info', title: 'Quản lý đang xem ý kiến của bạn về kết quả' }
    case 'REWORK_REQUIRED':
      return { tone: 'info', title: 'Smart Solar sẽ hẹn lịch làm lại' }
    default:
      return { tone: 'neutral', title: requestStatusMeta(r.status, 'customer').label }
  }
}

function ConfirmVisitPanel({ request }: { request: ServiceRequestView }) {
  const confirm = useConfirmAppointmentMutation()
  const [error, setError] = useState<string | null>(null)
  const visit = visitAwaitingCustomer(request)
  if (!visit) return null

  async function submit() {
    setError(null)
    try {
      await confirm.mutateAsync(request.requestId)
      toast.success('Đã xác nhận lịch hẹn.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Panel id="confirm-visit" className="scroll-mt-6">
      <PanelHeader title="Xác nhận lịch hẹn" />
      <PanelBody className="space-y-4">
        <p className="text-body text-fg">
          Smart Solar hẹn {visitPurposeLabel(visit.purpose).toLowerCase()} lúc{' '}
          <span className="tnum font-medium">{formatAppointment(visit.startsAt, visit.endsAt)}</span>
          {request.preferredStartsAt && `, khác giờ bạn chọn (${formatMoment(request.preferredStartsAt)})`}.
        </p>
        <p className="text-body text-fg-2">Không hợp giờ này thì huỷ yêu cầu hoặc gọi Smart Solar để đổi.</p>
        <Button icon="check_circle" variant="primary" disabled={confirm.isPending} onClick={() => void submit()}>
          {confirm.isPending ? 'Đang gửi…' : 'Đồng ý lịch này'}
        </Button>
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}

function AcceptancePanel({ request, onReject }: { request: ServiceRequestView; onReject: () => void }) {
  const completion = useCompletionMutation()
  const [error, setError] = useState<string | null>(null)
  const report = lastReport(request)

  async function accept() {
    setError(null)
    try {
      await completion.mutateAsync({ requestId: request.requestId, accept: true })
      toast.success('Đã nghiệm thu. Cảm ơn bạn.')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Panel id="acceptance" className="scroll-mt-6">
      <PanelHeader title="Nghiệm thu" description={request.outcome ? outcomeLabel(request.outcome) : undefined} />
      <PanelBody className="space-y-4">
        {report?.report && (
          <div>
            <p className="tnum text-meta text-fg-3">
              Báo cáo của {report.technicianName ?? 'kỹ thuật viên'}, {formatMoment(report.reportedAt)}
            </p>
            <p className="max-w-[72ch] text-body whitespace-pre-line text-fg">{report.report}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Button icon="check_circle" variant="primary" disabled={completion.isPending} onClick={() => void accept()}>
            {completion.isPending ? 'Đang gửi…' : 'Đồng ý kết quả'}
          </Button>
          <Button icon="thumb_down" variant="danger" disabled={completion.isPending} onClick={onReject}>
            Chưa đạt
          </Button>
        </div>
        {error && (
          <div role="alert">
            <Notice tone="danger">{error}</Notice>
          </div>
        )}
      </PanelBody>
    </Panel>
  )
}

function RequestFacts({
  request: r,
  onCancel,
  onReschedule,
}: {
  request: ServiceRequestView
  onCancel: () => void
  onReschedule: () => void
}) {
  const items: KV[] = [
    { k: 'Loại', v: requestKindLabel(r.kind) },
    { k: 'Ngày gửi', v: formatMoment(r.createdAt) },
  ]
  if (r.kind === 'FAULT') items.push({ k: 'Bảo hành lắp đặt', v: installationWarrantyText(r) })
  if (r.originRequestId)
    items.push({
      k: 'Phát hiện khi bảo trì',
      v: (
        <Link to={withId(ROUTES.customer.afterSalesRequest, r.originRequestId)} className="ui-link">
          Xem yêu cầu bảo trì
        </Link>
      ),
    })
  if (r.preferredStartsAt) items.push({ k: 'Giờ bạn muốn hẹn', v: formatMoment(r.preferredStartsAt) })
  if (r.completedAt) items.push({ k: 'Hoàn thành', v: formatMoment(r.completedAt) })
  if (r.cancelledAt) items.push({ k: 'Huỷ lúc', v: formatMoment(r.cancelledAt) })
  // Giờ lúc mở trang. Giờ máy có thể lệch giờ hệ thống: nút khoá theo giờ máy, backend vẫn kiểm (AFTER_SALES_CHANGE_TOO_LATE)
  const [now] = useState(() => Date.now())
  const reschedulable = canReschedule(r)
  const tooLate = reschedulable && rescheduleTooLate(r, now)
  const deadline = rescheduleDeadline(r)
  return (
    <Panel>
      <PanelHeader
        title="Nội dung yêu cầu"
        action={
          (reschedulable || customerCanCancel(r)) && (
            <div className="flex flex-wrap gap-3">
              {reschedulable && (
                <Button icon="edit_calendar" size="sm" variant="soft" disabled={tooLate} onClick={onReschedule}>
                  Đổi giờ
                </Button>
              )}
              {customerCanCancel(r) && (
                <Button icon="cancel" size="sm" variant="danger" onClick={onCancel}>
                  Huỷ yêu cầu
                </Button>
              )}
            </div>
          )
        }
      />
      <PanelBody className="space-y-4">
        <p className="max-w-[72ch] text-body whitespace-pre-line text-fg">{r.description}</p>
        <KeyValueList items={items} columns={2} />
        {reschedulable && deadline !== null && (
          <p className="tnum text-meta text-fg-2">
            {tooLate
              ? `Đã quá hạn đổi giờ trên mạng (trước giờ hẹn ${CHANGE_LEAD_HOURS} giờ). Liên hệ Smart Solar nếu cần đổi.`
              : `Đổi giờ được tới ${formatMoment(new Date(deadline).toISOString())}.`}
          </p>
        )}
      </PanelBody>
    </Panel>
  )
}

/** Hỗ trợ của gói thiên tai cho yêu cầu báo lỗi: kết quả xét và xin xét lại (một lần) */
function ClaimPanel({ request: r, onReconsider }: { request: ServiceRequestView; onReconsider: () => void }) {
  const claim = r.claim
  if (!claim) return null
  const status = CUSTOMER_CLAIM_STATUSES[claim.status] ?? { label: claim.status, tone: 'neutral' as const }
  const items: KV[] = [
    { k: 'Thiên tai', v: DISASTER_TYPES[claim.disasterType] ?? claim.disasterType },
    { k: 'Ngày xảy ra', v: formatMoment(claim.incidentOccurredAt) },
    { k: 'Kết quả', v: <Badge tone={status.tone}>{status.label}</Badge> },
  ]
  if (claim.decisionReason) items.push({ k: 'Lý do', v: claim.decisionReason })
  if (claim.reconsiderationRequestedAt)
    items.push({ k: 'Bạn xin xét lại lúc', v: formatMoment(claim.reconsiderationRequestedAt) })
  return (
    <Panel>
      <PanelHeader
        title="Hỗ trợ thiên tai"
        action={
          canRequestReconsideration(r) && (
            <Button icon="replay" size="sm" variant="soft" onClick={onReconsider}>
              Xin xét lại
            </Button>
          )
        }
      />
      <PanelBody className="space-y-4">
        <KeyValueList items={items} columns={2} />
        {canRequestReconsideration(r) && (
          <p className="text-meta text-fg-2">
            Mỗi yêu cầu chỉ xin xét lại được một lần, kèm thông tin hoặc ảnh bổ sung.
          </p>
        )}
      </PanelBody>
    </Panel>
  )
}

/** Lỗi kỹ thuật viên phát hiện trong lần bảo trì: khách báo lỗi thành yêu cầu riêng, vẫn gắn với lần bảo trì này */
function MaintenanceFindingPanel({ request: r, onReport }: { request: ServiceRequestView; onReport: () => void }) {
  if (!canReportFaultFromMaintenance(r)) return null
  const finding = maintenanceFinding(r)
  return (
    <Panel>
      <PanelHeader
        title="Phát hiện khi bảo trì"
        action={
          <Button icon="report" size="sm" variant="danger" onClick={onReport}>
            Báo lỗi
          </Button>
        }
      />
      <PanelBody>
        <p className="max-w-[72ch] text-body whitespace-pre-line text-fg-2">
          {finding ?? 'Kỹ thuật viên không ghi lỗi nào. Thấy lỗi sau lần bảo trì này thì báo lỗi ở đây.'}
        </p>
      </PanelBody>
    </Panel>
  )
}

// Chi tiết một yêu cầu của khách: tình hình, việc khách cần làm (xác nhận lịch, duyệt / thanh toán báo giá, nghiệm thu),
// kết quả kiểm tra, các buổi hẹn, báo giá cũ. Nút chỉ hiện khi trạng thái cho phép; backend vẫn kiểm tra lại
export function CustomerAfterSalesRequestPage() {
  const { id } = useParams()
  const query = useMyServiceRequestQuery(id)
  const cancel = useCancelRequestMutation()
  const completion = useCompletionMutation()
  const reschedule = useRescheduleRequestMutation()
  // Chỉ để biết kỳ và hạn của lượt bảo trì khi đổi giờ; chưa tải được thì chỉ kiểm thời gian đặt trước
  const subscriptions = useSubscriptionsQuery()
  const [dialog, setDialog] = useState<'cancel' | 'reject-work' | 'reschedule' | 'reconsider' | 'fault' | null>(null)
  const getUrl = useCallback((evidenceId: string) => getEvidenceUrl(id ?? '', evidenceId), [id])
  usePageCrumb(query.data ? query.data.requestNumber : null)

  return (
    <QueryBoundary query={query}>
      {(r) => {
        const status = requestStatusMeta(r.status, 'customer')
        const next = nextStep(r)
        const quotation = openQuotation(r)
        const pastQuotations = r.quotations.filter((q) => q !== quotation)
        const visit = entitlementOf(r, subscriptions.data ?? [])
        return (
          <>
            <PageHeader
              meta={
                <>
                  {/* Việc cần làm đã báo đỏ ở khối Tình hình */}
                  <Badge tone={next.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>
                  <Link to={withId(ROUTES.customer.project, r.projectId)} className="ui-link">
                    Công trình {shortCode(r.projectId)}
                  </Link>
                </>
              }
              title={
                <>
                  {requestKindLabel(r.kind)} <span className="tnum">{r.requestNumber}</span>
                </>
              }
            />

            <div className="space-y-6">
              <ProgressTracker steps={requestTrackerSteps(r)} next={next} />
              <ConfirmVisitPanel request={r} />
              {quotation && <CustomerQuotationPanel quotation={quotation} />}
              {r.status === 'PENDING_CUSTOMER_ACCEPTANCE' && (
                <AcceptancePanel request={r} onReject={() => setDialog('reject-work')} />
              )}
              <ClaimPanel request={r} onReconsider={() => setDialog('reconsider')} />
              <MaintenanceFindingPanel request={r} onReport={() => setDialog('fault')} />
              <RequestFacts
                request={r}
                onCancel={() => setDialog('cancel')}
                onReschedule={() => setDialog('reschedule')}
              />
              {r.items.length > 0 && (
                <Panel>
                  <PanelHeader title="Kết quả kiểm tra" description={`${r.items.length} hạng mục`} />
                  <PanelBody>
                    <ServiceItemList items={r.items} />
                  </PanelBody>
                </Panel>
              )}
              {r.visits.length > 0 && (
                <Panel>
                  <PanelHeader title="Buổi hẹn" />
                  <PanelBody>
                    <ServiceVisitList visits={r.visits} />
                  </PanelBody>
                </Panel>
              )}
              {r.evidence.length > 0 && (
                <Panel>
                  <PanelHeader title="Ảnh" description={`${r.evidence.length} ảnh`} />
                  <PanelBody>
                    <ServicePhotos photos={r.evidence} getUrl={getUrl} emptyText="Chưa có ảnh nào." />
                  </PanelBody>
                </Panel>
              )}
              {pastQuotations.length > 0 && (
                <Panel>
                  <PanelHeader title="Báo giá" />
                  <PanelBody className="space-y-6">
                    {pastQuotations.map((q) => (
                      <QuotationDetail key={q.quotationId} quotation={q} />
                    ))}
                  </PanelBody>
                </Panel>
              )}
            </div>

            <ReasonDialog
              open={dialog === 'cancel'}
              title="Huỷ yêu cầu này?"
              description="Chưa thanh toán thì huỷ ngay. Đã thanh toán thì quản lý xét yêu cầu huỷ."
              submitLabel="Huỷ yêu cầu"
              icon="cancel"
              variant="danger"
              onSubmit={async (reason) => {
                await cancel.mutateAsync({ requestId: r.requestId, reason })
                toast.success('Đã gửi yêu cầu huỷ.')
              }}
              onClose={() => setDialog(null)}
            />
            <PreferredTimeDialog
              open={dialog === 'reschedule'}
              title="Đổi giờ hẹn"
              icon="edit_calendar"
              submitLabel="Đổi giờ"
              limits={{
                leadDays: BOOKING_LEAD_DAYS,
                periodStartsAt: visit?.entitlement.periodStartsAt ?? null,
                latestAt: visit ? entitlementDeadline(visit.entitlement, visit.subscription) : null,
              }}
              onClose={() => setDialog(null)}
              onSubmit={async (preferredStartsAt) => {
                await reschedule.mutateAsync({ requestId: r.requestId, preferredStartsAt })
                toast.success('Đã đổi giờ. Smart Solar sẽ xếp lại lịch và báo lịch hẹn mới.')
                setDialog(null)
              }}
            >
              <p>Buổi đã hẹn (nếu có) bị huỷ và Smart Solar xếp lại theo giờ mới.</p>
            </PreferredTimeDialog>
            {dialog === 'reconsider' && (
              <ReconsiderationDialog requestId={r.requestId} onClose={() => setDialog(null)} />
            )}
            {dialog === 'fault' && (
              <MaintenanceFaultDialog
                requestId={r.requestId}
                finding={maintenanceFinding(r)}
                onClose={() => setDialog(null)}
              />
            )}
            <ReasonDialog
              open={dialog === 'reject-work'}
              title="Kết quả chưa đạt?"
              description="Quản lý sẽ xem ý kiến của bạn và hẹn kỹ thuật viên làm lại nếu cần."
              label="Điều chưa đạt"
              submitLabel="Gửi ý kiến"
              icon="thumb_down"
              variant="danger"
              onSubmit={async (reason) => {
                await completion.mutateAsync({ requestId: r.requestId, accept: false, reason })
                toast.success('Đã gửi ý kiến cho quản lý.')
              }}
              onClose={() => setDialog(null)}
            />
          </>
        )
      }}
    </QueryBoundary>
  )
}
