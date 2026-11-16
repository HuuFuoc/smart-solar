import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { BlockTitle } from '@/components/common/ui/block-title'
import { Button } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker, type TrackerNext } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { AssetCorrectionPanel } from '@/features/after-sales/AssetCorrectionPanel'
import { ClaimDecisionPanel } from '@/features/after-sales/ClaimDecisionPanel'
import { CancellationDecisionForm, CoverageForm, DisputeReviewForm } from '@/features/after-sales/ManagerDecisionForms'
import { DuplicateOfNotice, RequestClosePanel } from '@/features/after-sales/RequestClosePanel'
import { canDecideClaim } from '@/features/after-sales/managerAfterSalesRules'
import { WarrantyActivationPanel } from '@/features/after-sales/WarrantyActivationPanel'
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
    return {
      tone: 'danger',
      title: 'Khách xin huỷ việc đã thanh toán',
      body: r.cancellationReason ?? undefined,
      action: { label: 'Xét yêu cầu huỷ', icon: 'gavel', target: 'cancellation' },
    }
  if (purpose && !visit) {
    const declined = r.visits.at(-1)?.status === 'DECLINED'
    return {
      tone: 'danger',
      title: `Xếp kỹ thuật viên ${visitPurposeLabel(purpose).toLowerCase()}`,
      body: declined ? 'Kỹ thuật viên của buổi trước đã từ chối.' : undefined,
      action: { label: 'Xếp lịch', icon: 'event_available', target: 'schedule' },
    }
  }
  // Hạng mục chỉ xét "gói thiên tai" sau khi hỗ trợ được duyệt, nên quyết định này đứng trước xét bảo hành
  if (canDecideClaim(r) && visit?.status !== 'SCHEDULED')
    return {
      tone: 'danger',
      title:
        r.claim?.status === 'RECONSIDERATION_REQUESTED'
          ? 'Khách xin xét lại hỗ trợ của gói thiên tai'
          : 'Xét hỗ trợ của gói thiên tai',
      body: 'Duyệt hoặc từ chối dựa trên ảnh và báo cáo của kỹ thuật viên.',
      action: { label: 'Xét hỗ trợ', icon: 'gavel', target: 'claim' },
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
        action: { label: 'Xét bảo hành', icon: 'gavel', target: 'coverage' },
      }
    case 'AWAITING_QUOTATION':
      return { tone: 'info', title: 'Kinh doanh đang lập báo giá' }
    case 'AWAITING_CUSTOMER':
      return { tone: 'info', title: 'Chờ khách duyệt và thanh toán báo giá' }
    case 'PENDING_CUSTOMER_ACCEPTANCE':
      return { tone: 'info', title: 'Chờ khách nghiệm thu' }
    case 'DISPUTED':
      return {
        tone: 'danger',
        title: 'Khách chưa đồng ý kết quả',
        body: r.customerDecisionReason ?? undefined,
        action: { label: 'Xét ý kiến của khách', icon: 'gavel', target: 'dispute' },
      }
    default:
      return { tone: 'neutral', title: requestStatusMeta(r.status, 'manager').label }
  }
}

function RequestFacts({ request: r }: { request: ServiceRequestView }) {
  const items = [
    { k: 'Loại dịch vụ', v: requestKindLabel(r.kind) },
    { k: 'Ngày gửi yêu cầu', v: formatMoment(r.createdAt) },
  ]
  if (r.preferredStartsAt) items.push({ k: 'Giờ khách muốn hẹn', v: formatMoment(r.preferredStartsAt) })
  if (r.kind === 'FAULT') {
    items.push({ k: 'Bảo hành lắp đặt lúc báo', v: installationWarrantyText(r) })
    items.push({ k: 'Bảo hành sửa chữa lúc báo', v: r.withinRepairWarranty ? 'Còn hạn' : 'Không có' })
  }
  return (
    <section aria-label="Nội dung yêu cầu" className="sv-card space-y-4">
      <h2 className="text-title font-semibold text-fg">
        <BlockTitle icon="description">Nội dung yêu cầu</BlockTitle>
      </h2>
      <p className="rounded-container bg-surface-2 p-4 text-body whitespace-pre-line text-fg">{r.description}</p>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.k} className="sv-work-box">
            <dt className="text-meta text-fg-3">{item.k}</dt>
            <dd className="tnum mt-0.5 text-body font-medium text-fg">{item.v}</dd>
          </div>
        ))}
      </dl>
      {r.possibleDuplicates.length > 0 && (
        <Notice tone="warn">
          Công trình còn {r.possibleDuplicates.length} yêu cầu báo lỗi khác đang mở:{' '}
          {r.possibleDuplicates.map((d) => d.requestNumber).join(', ')}. Kiểm tra xem có trùng không.
        </Notice>
      )}
    </section>
  )
}

/** Xếp lịch khi cần; buổi đã hẹn mà chưa bắt đầu thì bấm Đổi lịch mới hiện form */
function SchedulePanel({ request, zoneId }: { request: ServiceRequestView; zoneId: string | null }) {
  const [moving, setMoving] = useState(false)
  const purpose = visitToSchedule(request)
  if (!purpose) return null
  const visit = openVisit(request)
  return (
    <Panel id="schedule" className="scroll-mt-6">
      <PanelHeader
        title={visit ? 'Lịch hẹn' : `Xếp lịch ${visitPurposeLabel(purpose).toLowerCase()}`}
        description={visit ? formatAppointment(visit.startsAt, visit.endsAt) : undefined}
        action={
          visit && (
            <Button
              icon={moving ? 'close' : 'edit_calendar'}
              size="sm"
              variant={moving ? 'secondary' : 'soft'}
              onClick={() => setMoving((m) => !m)}
            >
              {moving ? 'Thôi đổi' : 'Đổi lịch'}
            </Button>
          )
        }
      />
      {(!visit || moving) && (
        <PanelBody>
          <ScheduleVisitForm request={request} purpose={purpose} zoneId={zoneId} onDone={() => setMoving(false)} />
        </PanelBody>
      )}
    </Panel>
  )
}

// Chi tiết yêu cầu cho quản lý / quản trị: xếp lịch, xét hỗ trợ thiên tai, xét bảo hành, xét khiếu nại, xét yêu cầu huỷ,
// kết thúc yêu cầu (trùng, dừng việc, không thực hiện được), sửa thông tin thiết bị
function AfterSalesRequestPage({
  installationPattern,
  detailPattern,
}: {
  installationPattern: string
  detailPattern: string
}) {
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
          <div className="sv-detail">
            <div className="sv-card mb-6">
              <PageHeader
                meta={
                  <>
                    <span className="sv-pill" data-tone={next.tone === 'danger' ? undefined : status.tone}>
                      <Badge tone={next.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>
                    </span>
                    <Link to={withId(installationPattern, r.projectId)} className="sv-chip ui-link tnum">
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
            </div>

            <div className="space-y-6">
              <div className="sv-card">
                <ProgressTracker steps={requestTrackerSteps(r)} next={next} title="Tình hình xử lý" />
              </div>
              {r.duplicateOfRequestId && (
                <DuplicateOfNotice requestId={r.duplicateOfRequestId} detailPattern={detailPattern} />
              )}
              {open && r.cancellationRequestedAt && (
                <div className="sv-card">
                  <Panel id="cancellation" className="scroll-mt-6">
                    <PanelHeader title="Yêu cầu huỷ của khách" description={formatMoment(r.cancellationRequestedAt)} />
                    <PanelBody>
                      <CancellationDecisionForm request={r} />
                    </PanelBody>
                  </Panel>
                </div>
              )}
              {open && (
                <div className="sv-card">
                  <SchedulePanel request={r} zoneId={project.data?.zone?.zoneId ?? null} />
                </div>
              )}
              <div className="sv-card">
                <ClaimDecisionPanel request={r} />
              </div>
              {open && pendingItems(r).length > 0 && (
                <div className="sv-card">
                  <Panel id="coverage" className="scroll-mt-6">
                    <PanelHeader
                      title="Xét bảo hành"
                      description={`${pendingItems(r).length} hạng mục chờ quyết định`}
                    />
                    <PanelBody>
                      <CoverageForm request={r} />
                    </PanelBody>
                  </Panel>
                </div>
              )}
              {r.status === 'DISPUTED' && (
                <div className="sv-card">
                  <Panel id="dispute" className="scroll-mt-6">
                    <PanelHeader title="Xét ý kiến của khách" />
                    <PanelBody>
                      <DisputeReviewForm request={r} />
                    </PanelBody>
                  </Panel>
                </div>
              )}
              <RequestFacts request={r} />
              {r.items.length > 0 && (
                <div className="sv-card">
                  <Panel>
                    <PanelHeader
                      title={<BlockTitle icon="fact_check">Kết quả kiểm tra</BlockTitle>}
                      description={`${r.items.length} hạng mục`}
                    />
                    <PanelBody>
                      <ServiceItemList items={r.items} />
                    </PanelBody>
                  </Panel>
                </div>
              )}
              {project.data && (
                <div className="sv-card">
                  <WarrantyActivationPanel request={r} assets={project.data.assets} />
                </div>
              )}
              {project.data && (
                <div className="sv-card">
                  <AssetCorrectionPanel request={r} assets={project.data.assets} />
                </div>
              )}
              {r.visits.length > 0 && (
                <div className="sv-card">
                  <Panel>
                    <PanelHeader title={<BlockTitle icon="event_note">Buổi hẹn</BlockTitle>} />
                    <PanelBody>
                      <ServiceVisitList visits={r.visits} />
                    </PanelBody>
                  </Panel>
                </div>
              )}
              {r.evidence.length > 0 && (
                <div className="sv-card">
                  <Panel>
                    <PanelHeader
                      title={<BlockTitle icon="photo_camera">Ảnh</BlockTitle>}
                      description={`${r.evidence.length} ảnh`}
                    />
                    <PanelBody>
                      <ServicePhotos photos={r.evidence} getUrl={getUrl} emptyText="Chưa có ảnh nào." />
                    </PanelBody>
                  </Panel>
                </div>
              )}
              {r.quotations.length > 0 && (
                <div className="sv-card">
                  <Panel>
                    <PanelHeader title={<BlockTitle icon="request_quote">Báo giá dịch vụ</BlockTitle>} />
                    <PanelBody className="space-y-6">
                      {[...r.quotations].reverse().map((q) => (
                        <QuotationDetail key={q.quotationId} quotation={q} />
                      ))}
                    </PanelBody>
                  </Panel>
                </div>
              )}
              <div className="sv-card">
                <RequestClosePanel request={r} detailPattern={detailPattern} />
              </div>
            </div>
          </div>
        )
      }}
    </QueryBoundary>
  )
}

export function ManageAfterSalesRequestPage() {
  return (
    <AfterSalesRequestPage
      installationPattern={ROUTES.manage.installation}
      detailPattern={ROUTES.manage.afterSalesRequest}
    />
  )
}

export function AdminAfterSalesRequestPage() {
  return (
    <AfterSalesRequestPage
      installationPattern={ROUTES.admin.installation}
      detailPattern={ROUTES.admin.afterSalesRequest}
    />
  )
}
