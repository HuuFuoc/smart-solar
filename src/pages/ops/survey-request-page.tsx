import { Fragment, useState } from 'react'
import { useParams } from 'react-router'
import { Badge, Count } from '@/components/common/ui/badge'
import { Button, buttonClass } from '@/components/common/ui/button'
import { CloseRequestDialog } from '@/features/pre-surveys/CloseRequestDialog'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { ProgressTracker, type TrackerNext, type TrackerStep } from '@/components/common/ui/progress-tracker'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
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
import { Facts } from '@/features/pre-surveys/Facts'
import { formatKwh, formatOne, mountingLabel } from '@/features/pre-surveys/simulationDisplay'
import { SimulationHistory } from '@/features/pre-surveys/SimulationHistory'
import { SimulationViewer } from '@/features/pre-surveys/SimulationViewer'
import { useSimulationsQuery } from '@/hooks/useSimulations'
import { useSurveyRequestQuery } from '@/hooks/useSurveyRequests'
import { useStaffOnSiteSurveyQuery } from '@/hooks/useOnSiteSurvey'
import { useQuotationsQuery } from '@/hooks/useSalesQuotations'
import { OnSiteSurveyResultPanel } from '@/features/onsite-survey/OnSiteSurveyResultPanel'
import { currentQuotation, formatDateVn, quotationStatusMeta } from '@/features/quotations/quotationDisplay'
import { pricingApprovalStatus } from '@/features/quotations/quotationRules'
import { SalesQuotationPanel } from '@/features/quotations/SalesQuotationPanel'
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
      detail: quotation ? quotationStatusMeta(quotation, 'sales').label : undefined,
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

// Việc của sales sau khi khảo sát xong: lập, gửi, sửa báo giá tới khi khách đồng ý
function quotationNextStep(quotations: QuotationView[]): TrackerNext {
  const q = currentQuotation(quotations)
  if (!q)
    return {
      tone: 'danger',
      title: 'Cần bạn lập báo giá',
      body: 'Khảo sát tại công trình đã xong. Lập báo giá ở khối Báo giá bên dưới.',
    }
  if (q.status === 'DRAFT' && pricingApprovalStatus(q) === 'PENDING')
    return {
      tone: 'info',
      title: 'Chờ quản lý duyệt giá',
      body: 'Báo giá có giảm giá hoặc đơn giá thấp hơn giá danh mục. Quản lý duyệt xong thì bạn gửi được cho khách.',
    }
  if (q.status === 'DRAFT' && pricingApprovalStatus(q) === 'REJECTED')
    return {
      tone: 'danger',
      title: 'Quản lý không duyệt bộ giá này',
      body: 'Xem lý do ở mục Duyệt giá, sửa giá hoặc xin duyệt lại.',
    }
  if (q.status === 'DRAFT')
    return {
      tone: 'danger',
      title: 'Bản nháp báo giá chưa gửi khách',
      body: 'Thêm đủ dòng hàng, chi phí rồi gửi cho khách ở khối Báo giá.',
    }
  if (q.status === 'REVISION_REQUESTED')
    return { tone: 'danger', title: 'Khách yêu cầu sửa báo giá', body: 'Xem lý do ở khối Báo giá rồi lập bản sửa.' }
  if (q.status === 'ISSUED' && q.isExpired)
    return {
      tone: 'danger',
      title: 'Báo giá đã hết hạn mà khách chưa trả lời',
      body: 'Gọi khách rồi lập bản sửa với hạn mới.',
    }
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
      body: `Đồng ý lúc ${formatMoment(q.acceptedAt)}. Bước tiếp theo là lập hợp đồng.`,
    }
  return { tone: 'neutral', title: 'Đã khảo sát xong tại công trình' }
}

// Sau khi khách đồng ý báo giá: việc của hợp đồng. Thao tác nằm ở trang hợp đồng nên nút chỉ đưa tới khối Hợp đồng
function contractStep(contracts: ContractView[]): TrackerNext {
  const c = currentContract(contracts)
  if (!c)
    return {
      tone: 'danger',
      title: 'Cần bạn lập hợp đồng',
      body: 'Khách đã đồng ý báo giá. Lập hợp đồng ở khối Hợp đồng bên dưới.',
      action: { label: 'Lập hợp đồng', icon: 'add', target: 'contracts' },
    }
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
  if (quotations && acceptedQuotation(quotations) && contracts) return contractStep(contracts)
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

// Mô phỏng khách đã chọn + các lần chạy khác, sales chỉ được xem
function SimulationPanel({ request }: { request: SurveyRequestDetail }) {
  const selected = request.selectedSimulation
  const list = useSimulationsQuery(request.preSurveyId)
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
              preSurveyId={request.preSurveyId}
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
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="tnum">Mã {shortCode(r.surveyRequestId)}</span>
                </>
              }
              title={r.propertyName || 'Công trình chưa đặt tên'}
              description={formatAddress(r)}
              actions={
                <>
                  {r.customerPhone && (
                    // Cùng kiểu nút gọi với trang kỹ thuật viên; nút đặc dành cho việc chính của từng giai đoạn
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

            <ProgressTracker
              steps={trackerSteps(r, quotations.data, contracts.data)}
              next={nextStep(r, quotations.data, contracts.data)}
            />

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                <div id="survey-schedule" className="scroll-mt-6">
                  <SalesSchedulePanel request={r} />
                </div>
                <OnSiteSurveyResultPanel surveyRequestId={r.surveyRequestId} enabled={onsiteEnabled} />
                <SalesQuotationPanel
                  surveyRequestId={r.surveyRequestId}
                  enabled={surveyCompleted}
                  feasibility={onsite.data?.data.installationFeasibility}
                />
                <SalesContractPanel surveyRequestId={r.surveyRequestId} quotations={quotations.data} />
                <Panel>
                  <PanelHeader title="Số liệu khách khai" />
                  <PanelBody className="space-y-6">
                    {/* Số khách tự khai chỉ để đối chiếu: cùng cỡ chữ với biên bản đo thực tế, không to hơn */}
                    <Facts
                      items={[
                        { k: 'Dùng được / tổng', v: formatAreaPair(r.usableAreaM2, r.totalAreaM2) },
                        { k: 'Độ dốc mái', v: r.tiltDegree == null ? '—' : `${num.format(r.tiltDegree)} độ` },
                        {
                          k: 'Hướng mái',
                          v:
                            r.azimuthDegree == null
                              ? '—'
                              : `${num.format(r.azimuthDegree)} độ, ${directionLabel(r.azimuthDegree)}`,
                        },
                        { k: 'Vật cản', v: r.hasObstruction == null ? '—' : r.hasObstruction ? 'Có' : 'Không' },
                      ]}
                    />
                    <Facts
                      items={[
                        { k: 'Bề mặt', v: surfaceTypeLabel(r.installationSurfaceType) },
                        { k: 'Vật liệu', v: r.surfaceMaterial || '—' },
                      ]}
                    />
                  </PanelBody>
                </Panel>
              </div>

              <PanelAside aria-label="Khách hàng">
                <Panel>
                  <PanelHeader title="Khách hàng" />
                  <PanelBody>
                    <Facts
                      column
                      items={[
                        { k: 'Họ tên', v: r.customerName || '—' },
                        {
                          k: 'Điện thoại',
                          v: r.customerPhone ? (
                            <a className="tnum ui-link" href={`tel:${r.customerPhone}`}>
                              {r.customerPhone}
                            </a>
                          ) : (
                            '—'
                          ),
                        },
                        {
                          k: 'Email',
                          v: r.customerEmail ? (
                            <a className="ui-link wrap-anywhere" href={`mailto:${r.customerEmail}`}>
                              {/* Cột hẹp: ưu tiên xuống dòng ngay sau "@" thay vì giữa tên miền. */}
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
                          ) : (
                            '—'
                          ),
                        },
                      ]}
                    />
                  </PanelBody>
                </Panel>
              </PanelAside>
            </div>

            {/* Mô phỏng trải hết chiều ngang để hình bố trí to và không chừa cột trống bên phải */}
            <div className="mt-6 space-y-4 border-t border-line pt-4">
              <SimulationPanel request={r} />
            </div>

            {canClose && (
              <CloseRequestDialog
                key={String(notFeasible)}
                surveyRequestId={r.surveyRequestId}
                notFeasible={notFeasible}
                open={closing}
                onOpenChange={setClosing}
              />
            )}
          </>
        )
      }}
    </QueryBoundary>
  )
}
