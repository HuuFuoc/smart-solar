import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { KeyValueList, Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker, type TrackerNext } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { CancellationDecisionForm, CoverageForm, DisputeReviewForm } from '@/features/after-sales/ManagerDecisionForms'
import { ScheduleVisitForm } from '@/features/after-sales/ScheduleVisitForm'
import { QuotationDetail, ServiceItemList, ServiceVisitList } from '@/features/after-sales/ServiceRequestParts'
import { ServicePhotos } from '@/features/after-sales/ServicePhotos'
import {
  isFinalRequest,
  openVisit,
  outcomeLabel,
  pendingItems,
  installationWarrantyText,
  requestKindLabel,
  requestStatusMeta,
  requestTrackerSteps,
  visitPurposeLabel,
  visitToSchedule,
} from '@/features/after-sales/serviceDisplay'
import { shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatAppointment, formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useServiceRequestQuery } from '@/hooks/useManagerAfterSales'
import { useInstallationProjectQuery } from '@/hooks/useManagerInstallations'
import { ROUTES, withId } from '@/routes/paths'
import { getEvidenceUrl } from '@/services/managerAfterSalesService'
import type { ServiceRequestView } from '@/types/res/customerAfterSalesRes'

// Đỏ khi quản lý phải làm, xanh dương khi chờ người khác, xanh lá khi đã ổn
function nextStep(r: ServiceRequestView): TrackerNext {
  const visit = openVisit(r)
  const purpose = visitToSchedule(r)
  if (isFinalRequest(r.status))
    return {
      tone: r.status === 'COMPLETED' ? 'ok' : 'neutral',
      title: requestStatusMeta(r.status, 'manager').label,
      body: r.outcome ? outcomeLabel(r.outcome) : (r.cancellationReason ?? undefined),
    }
  if (r.cancellationRequestedAt)
    return { tone: 'danger', title: 'Khách xin huỷ việc đã thanh toán', body: r.cancellationReason ?? undefined }
  if (purpose && !visit) {
    const declined = r.visits.at(-1)?.status === 'DECLINED'
    return {
      tone: 'danger',
      title: `Xếp kỹ thuật viên ${visitPurposeLabel(purpose).toLowerCase()}`,
      body: declined ? 'Kỹ thuật viên của buổi trước đã từ chối.' : undefined,
    }
  }
  if (visit?.status === 'SCHEDULED') {
    const when = formatAppointment(visit.startsAt, visit.endsAt)
    if (visit.assignmentStatus === 'PENDING')
      return { tone: 'info', title: `Chờ ${visit.technicianName ?? 'kỹ thuật viên'} nhận lịch`, body: when }
    if (visit.customerConfirmationRequired && !visit.customerConfirmedAt)
      return { tone: 'info', title: 'Chờ khách xác nhận giờ hẹn', body: when }
    return { tone: 'ok', title: `${visit.technicianName ?? 'Kỹ thuật viên'} đã nhận lịch`, body: when }
  }
  switch (r.status) {
    case 'IN_PROGRESS':
      return { tone: 'info', title: 'Kỹ thuật viên đang làm tại công trình' }
    case 'AWAITING_DECISION':
      return {
        tone: 'danger',
        title: 'Xét bảo hành từng hạng mục',
        body: 'Hạng mục khách trả tiền sẽ sang kinh doanh báo giá.',
      }
    case 'AWAITING_QUOTATION':
      return { tone: 'info', title: 'Kinh doanh đang lập báo giá' }
    case 'AWAITING_CUSTOMER':
      return { tone: 'info', title: 'Chờ khách duyệt và thanh toán báo giá' }
    case 'PENDING_CUSTOMER_ACCEPTANCE':
      return { tone: 'info', title: 'Chờ khách nghiệm thu' }
    case 'DISPUTED':
      return { tone: 'danger', title: 'Khách chưa đồng ý kết quả', body: r.customerDecisionReason ?? undefined }
    default:
      return { tone: 'neutral', title: requestStatusMeta(r.status, 'manager').label }
  }
}

function RequestFacts({ request: r }: { request: ServiceRequestView }) {
  const items = [
    { k: 'Loại', v: requestKindLabel(r.kind) },
    { k: 'Ngày gửi', v: formatMoment(r.createdAt) },
  ]
  if (r.kind === 'FAULT') {
    items.push({ k: 'Bảo hành lắp đặt lúc báo', v: installationWarrantyText(r) })
    items.push({ k: 'Bảo hành sửa chữa lúc báo', v: r.withinRepairWarranty ? 'Còn hạn' : 'Không có' })
  }
  if (r.preferredStartsAt) items.push({ k: 'Giờ khách muốn hẹn', v: formatMoment(r.preferredStartsAt) })
  return (
    <Panel>
      <PanelHeader title="Nội dung yêu cầu" />
      <PanelBody className="space-y-4">
        <p className="max-w-[72ch] text-body whitespace-pre-line text-fg">{r.description}</p>
        <KeyValueList items={items} columns={2} />
        {r.possibleDuplicates.length > 0 && (
          <Notice tone="warn">
            Công trình còn {r.possibleDuplicates.length} yêu cầu báo lỗi khác đang mở:{' '}
            {r.possibleDuplicates.map((d) => d.requestNumber).join(', ')}. Kiểm tra xem có trùng không.
          </Notice>
        )}
      </PanelBody>
    </Panel>
  )
}

/** Xếp lịch khi cần; buổi đã hẹn mà chưa bắt đầu thì bấm Đổi lịch mới hiện form */
function SchedulePanel({ request, zoneId }: { request: ServiceRequestView; zoneId: string | null }) {
  const [moving, setMoving] = useState(false)
  const purpose = visitToSchedule(request)
  if (!purpose) return null
  const visit = openVisit(request)
  return (
    <Panel>
      <PanelHeader
        title={visit ? 'Lịch hẹn' : `Xếp lịch ${visitPurposeLabel(purpose).toLowerCase()}`}
        description={visit ? formatAppointment(visit.startsAt, visit.endsAt) : undefined}
        action={
          visit && (
            <Button icon="close" size="sm" variant="secondary" onClick={() => setMoving((m) => !m)}>
              {moving ? 'Thôi đổi' : 'Đổi lịch'}
            </Button>
          )
        }
      />
      {(!visit || moving) && (
        <PanelBody>
          <ScheduleVisitForm request={request} purpose={purpose} zoneId={zoneId} />
        </PanelBody>
      )}
    </Panel>
  )
}

// Chi tiết yêu cầu cho quản lý / quản trị: xếp lịch, xét bảo hành, xét khiếu nại, xét yêu cầu huỷ
function AfterSalesRequestPage({ installationPattern }: { installationPattern: string }) {
  const { id } = useParams()
  const query = useServiceRequestQuery(id)
  // Khu vực của công trình để biết kỹ thuật viên nào cùng khu vực
  const project = useInstallationProjectQuery(query.data?.projectId)
  const getUrl = useCallback((evidenceId: string) => getEvidenceUrl(id ?? '', evidenceId), [id])
  usePageCrumb(query.data ? query.data.requestNumber : null)

  return (
    <QueryBoundary query={query}>
      {(r) => {
        const status = requestStatusMeta(r.status, 'manager')
        const next = nextStep(r)
        const open = !isFinalRequest(r.status)
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={next.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>
                  <Link to={withId(installationPattern, r.projectId)} className="ui-link">
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
              {open && r.cancellationRequestedAt && (
                <Panel>
                  <PanelHeader title="Yêu cầu huỷ của khách" description={formatMoment(r.cancellationRequestedAt)} />
                  <PanelBody>
                    <CancellationDecisionForm request={r} />
                  </PanelBody>
                </Panel>
              )}
              {open && <SchedulePanel request={r} zoneId={project.data?.zone?.zoneId ?? null} />}
              {open && pendingItems(r).length > 0 && (
                <Panel>
                  <PanelHeader title="Xét bảo hành" description={`${pendingItems(r).length} hạng mục chờ quyết định`} />
                  <PanelBody>
                    <CoverageForm request={r} />
                  </PanelBody>
                </Panel>
              )}
              {r.status === 'DISPUTED' && (
                <Panel>
                  <PanelHeader title="Khách chưa đồng ý kết quả" />
                  <PanelBody>
                    <DisputeReviewForm request={r} />
                  </PanelBody>
                </Panel>
              )}
              <RequestFacts request={r} />
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
              {r.quotations.length > 0 && (
                <Panel>
                  <PanelHeader title="Báo giá" />
                  <PanelBody className="space-y-6">
                    {[...r.quotations].reverse().map((q) => (
                      <QuotationDetail key={q.quotationId} quotation={q} />
                    ))}
                  </PanelBody>
                </Panel>
              )}
            </div>
          </>
        )
      }}
    </QueryBoundary>
  )
}

export function ManageAfterSalesRequestPage() {
  return <AfterSalesRequestPage installationPattern={ROUTES.manage.installation} />
}

export function AdminAfterSalesRequestPage() {
  return <AfterSalesRequestPage installationPattern={ROUTES.admin.installation} />
}
