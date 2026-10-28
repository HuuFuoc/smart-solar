import { Fragment, useState } from 'react'
import { useParams } from 'react-router'
import { Badge, Count } from '@/components/common/ui/badge'
import { Button, buttonClass } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { ProgressTracker, type TrackerNext, type TrackerStep } from '@/components/common/ui/progress-tracker'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { EmptyState } from '@/components/common/ui/states'
import {
  addressMapUrl,
  directionLabel,
  formatAddress,
  formatDateTime,
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
import { SalesQuotationPanel } from '@/features/quotations/SalesQuotationPanel'
import { SalesSchedulePanel } from '@/features/scheduling/SalesSchedulePanel'
import {
  formatMoment,
  formatTimeRange,
  isConfirmed,
  relativeDay,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import type { QuotationView } from '@/types/res/quotationsRes'
import type { SurveyRequestDetail } from '@/types/res/surveyRequestsRes'

const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

/** "Ngày mai, 09:00-10:30" */
function whenText(startsAt: string, endsAt: string) {
  return `${relativeDay(vnDate(startsAt))}, ${formatTimeRange(startsAt, endsAt)}`
}

// Các bước của yêu cầu theo góc nhìn của sales. `quotations`: undefined khi chưa khảo sát xong hoặc đang tải
function trackerSteps(r: SurveyRequestDetail, quotations: QuotationView[] | undefined): TrackerStep[] {
  const a = r.appointment
  const confirmed = isConfirmed(a?.status)
  const quotation = quotations && currentQuotation(quotations)
  return [
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
      state: r.status === 5 ? 'done' : confirmed ? 'current' : 'todo',
    },
    {
      label: 'Báo giá',
      detail: quotation ? quotationStatusMeta(quotation, 'sales').label : undefined,
      state: quotation?.status === 'ACCEPTED' ? 'done' : r.status === 5 ? 'current' : 'todo',
    },
  ]
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

// Việc tiếp theo và ai làm. Đỏ chỉ khi sales phải làm
function nextStep(r: SurveyRequestDetail, quotations: QuotationView[] | undefined): TrackerNext {
  const a = r.appointment
  if (r.status === 5 && quotations) return quotationNextStep(quotations)
  if (r.status === 5)
    return {
      tone: 'neutral',
      title: 'Đã khảo sát xong tại công trình',
      body: 'Xem kết quả của kỹ thuật viên ở khối Kết quả khảo sát tại công trình.',
    }
  if (r.status === 6) return { tone: 'neutral', title: 'Yêu cầu đã huỷ' }
  if (!a)
    return isOverdue(r.submittedAt)
      ? {
          tone: 'danger',
          title: 'Khách chưa đặt giờ khảo sát sau hơn 1 ngày',
          body: 'Gọi khách nhắc chọn giờ trên cổng khách hàng.',
        }
      : { tone: 'info', title: 'Chờ khách đặt giờ khảo sát', body: 'Khách tự chọn giờ trên cổng khách hàng.' }
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
  usePageCrumb(query.data ? query.data.propertyName || 'Công trình chưa đặt tên' : null)
  // Cùng khoá query với khối kết quả khảo sát nên không gọi API hai lần. Báo giá chỉ lập được khi khảo sát đã hoàn thành
  const onsiteEnabled = query.data?.status === 5 || isConfirmed(query.data?.appointment?.status)
  const onsite = useStaffOnSiteSurveyQuery(id, { enabled: onsiteEnabled })
  const surveyCompleted = onsite.data?.status === 'COMPLETED'
  const quotations = useQuotationsQuery(id, { enabled: surveyCompleted })

  return (
    <QueryBoundary query={query}>
      {(r) => {
        const status = surveyStatusMeta(r.status)
        const map = addressMapUrl(formatAddress(r))
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
                    <a className={buttonClass('primary')} href={`tel:${r.customerPhone}`}>
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
                </>
              }
            />

            <ProgressTracker steps={trackerSteps(r, quotations.data)} next={nextStep(r, quotations.data)} />

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
                <Panel>
                  <PanelHeader title="Số liệu khách khai" />
                  <PanelBody className="space-y-6">
                    {/* Dùng lg: vì cx không gộp class, chỉ breakpoint lớn hơn mới đè được md:grid-cols-4 */}
                    <StatRow className="lg:grid-cols-5">
                      <Stat
                        label="Diện tích dùng được"
                        value={r.usableAreaM2 == null ? '—' : num.format(r.usableAreaM2)}
                        unit="m²"
                      />
                      <Stat
                        label="Tổng diện tích"
                        value={r.totalAreaM2 == null ? '—' : num.format(r.totalAreaM2)}
                        unit="m²"
                      />
                      <Stat
                        label="Độ dốc mái"
                        value={r.tiltDegree == null ? '—' : num.format(r.tiltDegree)}
                        unit="độ"
                      />
                      <Stat
                        label="Hướng mái"
                        value={r.azimuthDegree == null ? '—' : num.format(r.azimuthDegree)}
                        unit={r.azimuthDegree == null ? undefined : `độ, ${directionLabel(r.azimuthDegree)}`}
                      />
                      <Stat
                        label="Vật cản"
                        value={r.hasObstruction == null ? '—' : r.hasObstruction ? 'Có' : 'Không'}
                      />
                    </StatRow>
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
          </>
        )
      }}
    </QueryBoundary>
  )
}
