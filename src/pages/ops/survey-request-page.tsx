import { Fragment, useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { Badge, Count } from '@/components/common/ui/badge'
import { toast } from 'sonner'
import { cx } from '@/utils/cx'
import { Button, IconButton, buttonClass } from '@/components/common/ui/button'
import { CloseRequestDialog } from '@/features/pre-surveys/CloseRequestDialog'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { ProgressTracker, type TrackerNext, type TrackerStep } from '@/components/common/ui/progress-tracker'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Panel, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { EmptyState } from '@/components/common/ui/states'
import {
  addressMapUrl,
  directionLabel,
  formatAddress,
  formatAreaPair,
  formatDateTime,
  isClosedRequest,
  isOverdue,
  shortCode,
  surfaceTypeLabel,
  surveyStatusMeta,
} from '@/features/pre-surveys/preSurveyDisplay'
import { formatKwh, formatOne, mountingLabel } from '@/features/pre-surveys/simulationDisplay'
import { SimulationHistory } from '@/features/pre-surveys/SimulationHistory'
import { SimulationViewer } from '@/features/pre-surveys/SimulationViewer'
import { useSimulationsQuery } from '@/hooks/useSimulations'
import { useSurveyRequestQuery } from '@/hooks/useSurveyRequests'
import { useStaffOnSiteSurveyQuery } from '@/hooks/useOnSiteSurvey'
import { useQuotationsQuery } from '@/hooks/useSalesQuotations'
import { OnSiteSurveyResultPanel } from '@/features/onsite-survey/OnSiteSurveyResultPanel'
import { currentQuotation, formatDateVn, quotationStatusMeta } from '@/features/quotations/quotationDisplay'
import { QuotationReadPanel } from '@/features/quotations/QuotationReadPanel'
import { SalesContractPanel } from '@/features/contracts/SalesContractPanel'
import { contractNextStep, contractStatusLabel } from '@/features/contracts/contractDisplay'
import { acceptedQuotation, currentContract } from '@/features/contracts/contractRules'
import { useSurveyRequestContractsQuery } from '@/hooks/useContracts'
import { SalesSchedulePanel } from '@/features/scheduling/SalesSchedulePanel'
import {
  formatMoment,
  formatTimeRange,
  isAppointmentOverdue,
  isConfirmed,
  relativeDay,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import type { QuotationView } from '@/types/res/quotationsRes'
import type { ContractView } from '@/types/res/customerContractsRes'
import type { SurveyRequestDetail } from '@/types/res/surveyRequestsRes'

const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

function SvTile({ label, value, children }: { label: string; value: ReactNode; children?: ReactNode }) {
  return (
    <div className="sv-tile">
      <p className="sv-label text-meta">{label}</p>
      <p className="tnum text-title font-semibold wrap-break-word">{value}</p>
      {children}
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <IconButton
      icon="content_copy"
      label={label}
      size="sm"
      onClick={() => {
        if (navigator.clipboard) void navigator.clipboard.writeText(text).then(() => toast.success('Đã sao chép.'))
      }}
    />
  )
}

/** "Ngày mai, 09:00-10:30" */
function whenText(startsAt: string, endsAt: string) {
  return `${relativeDay(vnDate(startsAt))}, ${formatTimeRange(startsAt, endsAt)}`
}

// Các bước của yêu cầu theo góc nhìn của sales. `quotations`: undefined khi chưa khảo sát xong hoặc đang tải;
// `contracts`: undefined khi chưa có báo giá khách đồng ý hoặc đang tải
function trackerSteps(
  r: SurveyRequestDetail,
  quotations: QuotationView[] | undefined,
  contracts: ContractView[] | undefined,
): TrackerStep[] {
  const a = r.appointment
  const confirmed = isConfirmed(a?.status)
  const quotation = quotations && currentQuotation(quotations)
  const contract = contracts && currentContract(contracts)
  const steps: TrackerStep[] = [
    { label: 'Khách gửi yêu cầu', detail: formatDateTime(r.submittedAt), state: 'done' },
    { label: 'Khách đặt giờ', detail: a ? formatDateTime(a.bookedAt) : 'Chưa đặt', state: a ? 'done' : 'current' },
    {
      label: a?.status === 'ESCALATED' ? 'Cần phân công' : 'Kỹ thuật viên nhận',
      detail: confirmed ? (a?.assignedTechnicianName ?? undefined) : a ? 'Đang chờ' : undefined,
      state: confirmed ? 'done' : a ? 'current' : 'todo',
    },
    {
      label: 'Khảo sát tại công trình',
      detail: a ? whenText(a.startsAt, a.endsAt) : undefined,
      state: r.status === 'COMPLETED' ? 'done' : confirmed ? 'current' : 'todo',
    },
    {
      label: 'Báo giá',
      detail: quotation ? quotationStatusMeta(quotation, 'staff').label : undefined,
      state: quotation?.status === 'ACCEPTED' ? 'done' : r.status === 'COMPLETED' ? 'current' : 'todo',
    },
    {
      label: 'Hợp đồng',
      detail: contract ? contractStatusLabel(contract.status) : undefined,
      state: contract?.status === 'PAID' ? 'done' : quotation?.status === 'ACCEPTED' ? 'current' : 'todo',
    },
  ]
  // Yêu cầu đã đóng thì không còn bước nào đang làm
  return isClosedRequest(r.status)
    ? steps.map((step) => (step.state === 'current' ? { ...step, state: 'todo' } : step))
    : steps
}

// Sau khi khảo sát xong: kỹ thuật viên lập, gửi, sửa báo giá; khách trả lời. Kinh doanh chỉ tư vấn nên không có việc đỏ
function quotationNextStep(quotations: QuotationView[]): TrackerNext {
  const q = currentQuotation(quotations)
  if (!q)
    return {
      tone: 'info',
      title: 'Chờ kỹ thuật viên lập báo giá',
      body: 'Kỹ thuật viên đã khảo sát lập báo giá từ danh mục sản phẩm.',
    }
  if (q.status === 'DRAFT') return { tone: 'info', title: 'Kỹ thuật viên đang soạn báo giá' }
  if (q.status === 'REJECTED')
    return {
      tone: 'warn',
      title: 'Khách từ chối báo giá',
      body: 'Gọi khách tìm hiểu lý do; kỹ thuật viên có thể lập bản sửa, hoặc đóng yêu cầu nếu khách thôi.',
    }
  if (q.status === 'REVISION_REQUESTED')
    return { tone: 'info', title: 'Khách yêu cầu sửa, chờ kỹ thuật viên lập bản sửa' }
  if (q.status === 'ISSUED' && q.isExpired)
    return { tone: 'warn', title: 'Báo giá đã hết hạn mà khách chưa trả lời', body: 'Gọi khách hỏi ý kiến.' }
  if (q.status === 'ISSUED')
    return {
      tone: 'info',
      title: 'Chờ khách trả lời báo giá',
      body: `Hiệu lực đến hết ngày ${formatDateVn(q.validUntil)}. Gọi khách nếu cần giải thích.`,
    }
  if (q.status === 'ACCEPTED')
    return {
      tone: 'ok',
      title: 'Khách đã đồng ý báo giá',
      body: `Đồng ý lúc ${formatMoment(q.acceptedAt)}. Hợp đồng được lập tự động, quản lý hoàn thiện và gửi khách ký.`,
    }
  return { tone: 'neutral', title: 'Đã khảo sát xong tại công trình' }
}

// Sau khi khách đồng ý báo giá: việc của hợp đồng (quản lý, khách). Kinh doanh chỉ xem
function contractStep(contracts: ContractView[]): TrackerNext {
  const c = currentContract(contracts)
  // Bản nháp đầu tiên đã huỷ: báo giá này không lập hợp đồng được nữa, việc còn lại là đóng yêu cầu
  if (!c && contracts.some((x) => x.status === 'DISCARDED'))
    return {
      tone: 'danger',
      title: 'Bản nháp hợp đồng đã huỷ, cần đóng yêu cầu',
      body: 'Báo giá này không lập hợp đồng mới được nữa. Bấm Đóng yêu cầu ở đầu trang và ghi lý do.',
    }
  if (!c) return { tone: 'info', title: 'Hợp đồng đang được chuẩn bị', body: 'Quản lý hoàn thiện hợp đồng từ báo giá.' }
  const next = contractNextStep(c, 'sales')
  return next.action
    ? { ...next, action: { label: 'Mở khối Hợp đồng', icon: 'description', target: 'contracts' } }
    : next
}

// Việc tiếp theo và ai làm. Đỏ chỉ khi sales phải làm
function nextStep(
  r: SurveyRequestDetail,
  quotations: QuotationView[] | undefined,
  contracts: ContractView[] | undefined,
): TrackerNext {
  const a = r.appointment
  if (r.status === 'CLOSED') return { tone: 'neutral', title: 'Yêu cầu đã đóng' }
  if (r.status === 'CANCELLED') return { tone: 'neutral', title: 'Khách đã rút yêu cầu' }
  // Biên bản khảo sát đổi sau khi khách đồng ý thì bản đó không lập hợp đồng được: quay lại việc của báo giá
  const accepted = quotations && acceptedQuotation(quotations)
  if (accepted && contracts) return contractStep(contracts)
  if (r.status === 'COMPLETED' && quotations) return quotationNextStep(quotations)
  if (r.status === 'COMPLETED')
    return {
      tone: 'neutral',
      title: 'Đã khảo sát xong tại công trình',
      body: 'Xem kết quả của kỹ thuật viên ở khối Kết quả khảo sát tại công trình.',
    }
  if (!a)
    return isOverdue(r.submittedAt)
      ? {
          tone: 'danger',
          title: 'Khách chưa đặt giờ khảo sát sau hơn 1 ngày',
          body: 'Gọi khách nhắc chọn giờ trên cổng khách hàng.',
        }
      : { tone: 'info', title: 'Chờ khách đặt giờ khảo sát', body: 'Khách tự chọn giờ trên cổng khách hàng.' }
  if (isAppointmentOverdue(a))
    return {
      tone: 'danger',
      title: 'Lịch khảo sát đã qua giờ mà chưa có kết quả',
      body: `Lịch ${whenText(a.startsAt, a.endsAt)}. Gọi khách hẹn giờ khác rồi đổi giờ ở khối Lịch khảo sát.`,
      action: { label: 'Đổi giờ', icon: 'edit_calendar', target: 'survey-schedule' },
    }
  if (a.status === 'ESCALATED')
    return {
      tone: 'danger',
      title: 'Cần bạn phân công kỹ thuật viên',
      body: `Lịch ${whenText(a.startsAt, a.endsAt)} quá hạn mà chưa kỹ thuật viên nào nhận. Chọn người ở khối Lịch khảo sát.`,
      action: { label: 'Phân công', icon: 'assignment_ind', target: 'survey-schedule' },
    }
  if (a.status === 'PENDING_ACCEPTANCE')
    return {
      tone: 'info',
      title: 'Chờ kỹ thuật viên trong khu vực nhận lịch',
      body: `Hạn nhận ${formatDateTime(a.acceptanceDeadlineAt)}. Quá hạn mà không ai nhận thì bạn phân công.`,
    }
  return {
    tone: 'ok',
    title: `${a.assignedTechnicianName ?? 'Kỹ thuật viên'} sẽ khảo sát tại công trình`,
    body: `${whenText(a.startsAt, a.endsAt)}. Gọi khách xác nhận trước ngày hẹn.`,
  }
}

// Mô phỏng khách đã chọn + các lần chạy khác, sales chỉ được xem. Chỉ có khi khách gửi từ đánh giá sơ bộ
function SimulationPanel({ request, preSurveyId }: { request: SurveyRequestDetail; preSurveyId: string }) {
  const selected = request.selectedSimulation
  const list = useSimulationsQuery(preSurveyId)
  const [viewId, setViewId] = useState<string | null>(null)
  const viewing = viewId ?? selected?.simulationId ?? null
  const others = list.data?.items ?? []
  return (
    <>
      <Panel>
        <PanelHeader
          title="Mô phỏng khách đã chọn"
          description={
            selected
              ? `${mountingLabel(selected.mountingType)}, ${selected.productName}: ${selected.panelCount} tấm, ${formatOne(selected.installedCapacityKwp)} kWp${
                  selected.annualEnergyKwh != null ? `, ${formatKwh(selected.annualEnergyKwh)} kWh/năm` : ''
                }.`
              : undefined
          }
        />
        <PanelBody className="space-y-4">
          {selected && viewing !== selected.simulationId && (
            // Báo rõ đang xem lần chạy khác với lần khách chọn
            <Notice tone="info" title="Đang xem một lần chạy khác của khách">
              Đây không phải mô phỏng khách chọn khi gửi.
              <span className="mt-3 flex">
                <Button icon="visibility" variant="info" size="sm" onClick={() => setViewId(null)}>
                  Xem mô phỏng khách chọn
                </Button>
              </span>
            </Notice>
          )}
          {viewing ? (
            <SimulationViewer
              preSurveyId={preSurveyId}
              simulationId={viewing}
              staleNote="Khách đã sửa mặt lắp sau lần chạy này; số liệu có thể không khớp mặt lắp cuối cùng."
            />
          ) : (
            <EmptyState title="Khách chưa chạy mô phỏng" description="Dùng số liệu khách khai khi gọi khách." />
          )}
        </PanelBody>
      </Panel>
      {others.length > 1 && (
        <Panel>
          <PanelHeader
            title={
              <span className="flex items-center gap-2">
                Các lần chạy của khách <Count value={others.length} />
              </span>
            }
          />
          <PanelBody>
            <SimulationHistory items={others} viewingId={viewing} onView={setViewId} />
          </PanelBody>
        </Panel>
      )}
    </>
  )
}

// Chi tiết yêu cầu khảo sát, chỉ trả cho sales đã nhận yêu cầu
// Việc chính là theo dõi lịch khảo sát nên khối lịch đứng đầu, cạnh thông tin khách
export function OpsSurveyRequestPage() {
  const { id } = useParams()
  const query = useSurveyRequestQuery(id)
  const [closing, setClosing] = useState(false)
  usePageCrumb(query.data ? query.data.propertyName || 'Công trình chưa đặt tên' : null)
  // Cùng khoá query với khối kết quả khảo sát nên không gọi API hai lần. Báo giá chỉ lập được khi khảo sát đã hoàn thành
  const onsiteEnabled = query.data?.status === 'COMPLETED' || isConfirmed(query.data?.appointment?.status)
  const onsite = useStaffOnSiteSurveyQuery(id, { enabled: onsiteEnabled })
  const surveyCompleted = onsite.data?.status === 'COMPLETED'
  const quotations = useQuotationsQuery(id, { enabled: surveyCompleted })
  // Cùng khoá query với khối Hợp đồng; chỉ có hợp đồng khi khách đã đồng ý báo giá
  const contracts = useSurveyRequestContractsQuery(id, {
    enabled: Boolean(quotations.data && acceptedQuotation(quotations.data)),
  })

  return (
    <QueryBoundary query={query}>
      {(r) => {
        const status = surveyStatusMeta(r.status)
        const map = addressMapUrl(formatAddress(r))
        // Lịch còn hẹn thì chỉ khách huỷ được, nên chỉ đóng khi chưa đặt giờ hoặc đã khảo sát xong.
        // Đã có hợp đồng còn hiệu lực thì backend không cho đóng (SURVEY_REQUEST_CONTRACT_EXISTS)
        const hasLiveContract = Boolean(contracts.data && currentContract(contracts.data))
        const canClose =
          !isClosedRequest(r.status) && !hasLiveContract && (!r.appointment || r.appointment.status === 'COMPLETED')
        const notFeasible = onsite.data?.data.installationFeasibility === 'NOT_FEASIBLE'
        const initials = (r.customerName || r.customerEmail || '?')
          .split(/[\s@]+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0]!.toUpperCase())
          .join('')
        const usedPct =
          r.usableAreaM2 != null && r.totalAreaM2
            ? Math.min(100, Math.round((r.usableAreaM2 / r.totalAreaM2) * 100))
            : null
        return (
          <div className="sv-detail">
            <PageHeader
              meta={
                <>
                  <span className="sv-pill" data-tone={status.tone}>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </span>
                  <span className="sv-chip tnum">Mã {shortCode(r.surveyRequestId)}</span>
                </>
              }
              title={r.propertyName || 'Công trình chưa đặt tên'}
              description={
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="location_on" className="text-[20px]" />
                  {formatAddress(r)}
                </span>
              }
              actions={
                <>
                  {r.customerPhone && (
                    <a className={buttonClass('soft')} href={`tel:${r.customerPhone}`}>
                      <Icon name="call" className="-ml-0.5 text-[20px]" />
                      Gọi {r.customerPhone}
                    </a>
                  )}
                  {r.customerEmail && (
                    <a className={buttonClass('secondary')} href={`mailto:${r.customerEmail}`}>
                      <Icon name="mail" className="-ml-0.5 text-[20px]" />
                      Gửi email
                    </a>
                  )}
                  {map && (
                    <a className={buttonClass('secondary')} href={map} target="_blank" rel="noreferrer">
                      <Icon name="map" className="-ml-0.5 text-[20px]" />
                      Xem bản đồ
                      <span className="sr-only"> (mở tab mới)</span>
                    </a>
                  )}
                  {canClose && (
                    <Button variant="danger" icon="block" onClick={() => setClosing(true)}>
                      Đóng yêu cầu
                    </Button>
                  )}
                </>
              }
            />

            <div className="sv-card">
              <ProgressTracker
                steps={trackerSteps(r, quotations.data, contracts.data)}
                next={nextStep(r, quotations.data, contracts.data)}
              />
            </div>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-6 lg:col-span-2">
                <div id="survey-schedule" className="sv-card scroll-mt-6">
                  <SalesSchedulePanel request={r} />
                </div>
                <div className="sv-card">
                  <OnSiteSurveyResultPanel surveyRequestId={r.surveyRequestId} enabled={onsiteEnabled} />
                </div>
                <div className="sv-card">
                  <QuotationReadPanel surveyRequestId={r.surveyRequestId} enabled={surveyCompleted} />
                </div>
                <div className="sv-card">
                  <SalesContractPanel surveyRequestId={r.surveyRequestId} quotations={quotations.data} />
                </div>
                {!r.preSurveyId ? (
                  <div className="sv-card">
                    <Panel>
                      <PanelHeader title="Số liệu khách khai" />
                      <PanelBody>
                        <p className="text-body text-fg-2">
                          Khách đặt khảo sát trực tiếp, không qua đánh giá sơ bộ nên không có số liệu khai trước và mô
                          phỏng.
                        </p>
                      </PanelBody>
                    </Panel>
                  </div>
                ) : (
                  <div className="sv-card">
                    <Panel>
                      <PanelHeader
                        title={
                          <span className="sv-title">
                            <Icon name="home_work" className="text-[20px] text-accent-fg" />
                            Số liệu khách khai
                          </span>
                        }
                        action={<span className="text-meta text-fg-3">Tự kê khai qua form web</span>}
                      />
                      <PanelBody className="space-y-4">
                        <div className="sv-tiles">
                          <SvTile label="Dùng được / tổng" value={formatAreaPair(r.usableAreaM2, r.totalAreaM2)}>
                            {usedPct != null && (
                              <>
                                <span className="sv-bar" role="presentation">
                                  <span style={{ width: `${usedPct}%` }} />
                                </span>
                                <span className="text-meta text-fg-2">{usedPct}% diện tích</span>
                              </>
                            )}
                          </SvTile>
                          <SvTile
                            label="Độ dốc mái"
                            value={r.tiltDegree == null ? '—' : `${num.format(r.tiltDegree)} độ`}
                          />
                          <SvTile
                            label="Hướng mái"
                            value={
                              r.azimuthDegree == null
                                ? '—'
                                : `${num.format(r.azimuthDegree)} độ, ${directionLabel(r.azimuthDegree)}`
                            }
                          />
                          <SvTile
                            label="Vật cản"
                            value={r.hasObstruction == null ? '—' : r.hasObstruction ? 'Có' : 'Không có'}
                          />
                        </div>
                        <div className="sv-tiles">
                          <SvTile label="Bề mặt" value={surfaceTypeLabel(r.installationSurfaceType)} />
                          <SvTile label="Vật liệu" value={r.surfaceMaterial || '—'} />
                        </div>
                      </PanelBody>
                    </Panel>
                  </div>
                )}
              </div>

              <aside aria-label="Khách hàng" className="sv-card min-w-0 space-y-4 self-start">
                <h2 className="text-title font-semibold">Khách hàng</h2>
                <div className="flex items-center gap-3 border-t border-line pt-4">
                  <span className="sv-avatar text-title" aria-hidden>
                    {initials}
                  </span>
                  <p className="min-w-0 text-title font-semibold wrap-break-word">
                    {r.customerName || 'Chưa có họ tên'}
                  </p>
                </div>
                {r.customerPhone && (
                  <div className="sv-field">
                    <Icon name="call" className="text-[20px] text-fg-2" />
                    <a className="tnum ui-link min-w-0 flex-1" href={`tel:${r.customerPhone}`}>
                      {r.customerPhone}
                    </a>
                    <CopyButton text={r.customerPhone} label="Sao chép số điện thoại" />
                  </div>
                )}
                {r.customerEmail && (
                  <div className="sv-field">
                    <Icon name="mail" className="text-[20px] text-fg-2" />
                    <a className="ui-link min-w-0 flex-1 wrap-anywhere" href={`mailto:${r.customerEmail}`}>
                      {r.customerEmail.split('@').map((part, i) =>
                        i === 0
                          ? part
                          : [
                              <Fragment key={i}>
                                @<wbr />
                              </Fragment>,
                              part,
                            ],
                      )}
                    </a>
                    <CopyButton text={r.customerEmail} label="Sao chép email" />
                  </div>
                )}
                <dl className="space-y-2 border-t border-line pt-4 text-body">
                  <div className="sv-meta">
                    <dt className="text-fg-2">Thời gian tạo</dt>
                    <dd className="tnum text-right">{formatDateTime(r.submittedAt)}</dd>
                  </div>
                  {r.assignedAt && (
                    <div className="sv-meta">
                      <dt className="text-fg-2">Nhận yêu cầu lúc</dt>
                      <dd className="tnum text-right">{formatDateTime(r.assignedAt)}</dd>
                    </div>
                  )}
                </dl>
                {r.customerPhone && (
                  <a className={cx(buttonClass('primary'), 'w-full')} href={`tel:${r.customerPhone}`}>
                    <Icon name="call" className="-ml-0.5 text-[20px]" />
                    Liên hệ khách hàng
                  </a>
                )}
              </aside>
            </div>

            {r.preSurveyId && (
              <div className="sv-card mt-6">
                <SimulationPanel request={r} preSurveyId={r.preSurveyId} />
              </div>
            )}

            {canClose && (
              <CloseRequestDialog
                key={String(notFeasible)}
                surveyRequestId={r.surveyRequestId}
                notFeasible={notFeasible}
                open={closing}
                onOpenChange={setClosing}
              />
            )}
          </div>
        )
      }}
    </QueryBoundary>
  )
}
