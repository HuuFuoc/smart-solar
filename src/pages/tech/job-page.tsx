import { Fragment } from 'react'
import { useParams } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink, buttonClass } from '@/components/common/ui/button'
import { Notice } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { Facts } from '@/features/pre-surveys/Facts'
import {
  directionLabel,
  formatAddress,
  formatCoordinates,
  formatDateTime,
  hasCoordinates,
  mapsUrl,
  shortCode,
} from '@/features/pre-surveys/preSurveyDisplay'
import { formatKwh, formatOne, mountingLabel } from '@/features/pre-surveys/simulationDisplay'
import { SimulationViewer } from '@/features/pre-surveys/SimulationViewer'
import { TravelSummary } from '@/features/scheduling/TravelSummary'
import {
  appointmentStatusMeta,
  formatAppointment,
  surfaceNameLabel,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import { useAcknowledgeMutation, useMyAppointmentQuery } from '@/hooks/useTechnicianJobs'
import { ROUTES } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { TechnicianJobView } from '@/types/res/technicianAppointmentsRes'

const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const n = (v: number | null | undefined) => (v == null ? '—' : num.format(v))

function AcknowledgePanel({ job }: { job: TechnicianJobView }) {
  const acknowledge = useAcknowledgeMutation()
  async function confirm() {
    try {
      const result = await acknowledge.mutateAsync(job.appointmentId)
      // Gửi lại khi đã nhận (mất phản hồi lần trước) vẫn là thành công.
      toast.success(
        result.alreadyAcknowledged
          ? 'Bạn đã nhận việc này trước đó.'
          : 'Đã nhận việc. Kinh doanh và khách sẽ thấy bạn đã xác nhận.',
      )
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <Panel raised>
      <PanelHeader
        title="Xác nhận nhận việc"
        description={`Kinh doanh giao lịch này cho bạn lúc ${formatDateTime(job.assignedAt)}. Xem địa chỉ và số liệu bên dưới rồi xác nhận để mọi người biết bạn đã nhận.`}
      />
      <PanelBody>
        <Button
          variant="primary"
          disabled={acknowledge.isPending}
          onClick={() => void confirm()}
          className="w-full sm:w-auto"
        >
          {acknowledge.isPending ? 'Đang xác nhận…' : 'Nhận việc'}
        </Button>
      </PanelBody>
    </Panel>
  )
}

// Chi tiết một lịch khảo sát được giao. Chỉ tới bước "Nhận việc", chưa có "Hoàn thành khảo sát"
export function TechJobPage() {
  const { id } = useParams()
  const query = useMyAppointmentQuery(id)
  usePageCrumb(query.data?.property.name ?? null)

  return (
    <QueryBoundary query={query}>
      {(job) => {
        const status = appointmentStatusMeta(job.status, 'technician')
        const p = job.property
        const located = hasCoordinates(p.latitude, p.longitude)
        const map = located ? mapsUrl(p.latitude!, p.longitude!) : null
        const s = job.preSurvey
        const sim = job.selectedSimulation
        return (
          <>
            <PageHeader
              meta={
                <>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span className="tnum">Mã {shortCode(job.surveyRequestId)}</span>
                </>
              }
              title={p.name}
              description={formatAppointment(job.startsAt, job.endsAt)}
              actions={
                <>
                  {job.customer.phone && (
                    <a className={buttonClass('secondary')} href={`tel:${job.customer.phone}`}>
                      <Icon name="call" className="-ml-0.5 text-[20px]" />
                      Gọi khách
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

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                {job.status === 'ASSIGNED' && <AcknowledgePanel job={job} />}
                {job.status === 'ACKNOWLEDGED' && (
                  <Notice tone="ok">
                    Bạn đã nhận việc lúc {formatDateTime(job.acknowledgedAt)}. Tới công trình đúng giờ hẹn.
                  </Notice>
                )}

                <Panel>
                  <PanelHeader
                    title="Đường tới công trình"
                    action={
                      <ButtonLink
                        to={`${ROUTES.tech.schedule}?ngay=${vnDate(job.startsAt)}`}
                        size="sm"
                        icon="calendar_month"
                      >
                        Lịch cả ngày
                      </ButtonLink>
                    }
                  />
                  <PanelBody>
                    {job.inboundTravelEstimate ? (
                      <TravelSummary leg={job.inboundTravelEstimate} />
                    ) : (
                      <p className="text-body text-fg-2">Chưa có ước tính đường đi cho lịch này.</p>
                    )}
                  </PanelBody>
                </Panel>

                <Panel>
                  <PanelHeader title="Công trình" />
                  <PanelBody>
                    <Facts
                      items={[
                        { k: 'Địa chỉ', v: formatAddress(p) },
                        {
                          k: 'Toạ độ',
                          v: located ? (
                            <a className="tnum ui-link" href={map!} target="_blank" rel="noreferrer">
                              {formatCoordinates(p.latitude!, p.longitude!)}
                            </a>
                          ) : (
                            '—'
                          ),
                        },
                        { k: 'Bề mặt', v: surfaceNameLabel(p.installationSurfaceType) },
                        { k: 'Vật liệu', v: p.surfaceMaterial || '—' },
                      ]}
                    />
                  </PanelBody>
                </Panel>

                <Panel>
                  <PanelHeader title="Số liệu khách khai" description="Đo lại tại công trình để đối chiếu." />
                  <PanelBody className="space-y-6">
                    <StatRow className="lg:grid-cols-3">
                      <Stat
                        label="Mặt lắp (rộng × dài)"
                        value={s.surfaceWidthM == null ? '—' : `${n(s.surfaceWidthM)} × ${n(s.surfaceLengthM)}`}
                        unit="m"
                      />
                      <Stat label="Dùng được / tổng" value={`${n(s.usableAreaM2)} / ${n(s.totalAreaM2)}`} unit="m²" />
                      <Stat label="Độ dốc" value={n(s.surfaceTiltDegree)} unit="độ" />
                    </StatRow>
                    <Facts
                      items={[
                        {
                          k: 'Hướng mái',
                          v:
                            s.surfaceAzimuthDegree == null
                              ? '—'
                              : `${directionLabel(s.surfaceAzimuthDegree)} (${n(s.surfaceAzimuthDegree)}°)`,
                        },
                        {
                          k: 'Vật cản',
                          v: s.obstacleCount > 0 ? `${s.obstacleCount} vật cản` : s.hasObstruction ? 'Có' : 'Không',
                        },
                      ]}
                    />
                  </PanelBody>
                </Panel>

                <Panel>
                  <PanelHeader
                    title="Mô phỏng khách chọn"
                    description={
                      sim
                        ? `${mountingLabel(sim.mountingType)}, ${sim.productName}: ${sim.panelCount} tấm, ${formatOne(sim.installedCapacityKwp)} kWp${
                            sim.annualEnergyKwh != null ? `, ${formatKwh(sim.annualEnergyKwh)} kWh/năm` : ''
                          }.`
                        : undefined
                    }
                  />
                  <PanelBody>
                    {sim ? (
                      <SimulationViewer
                        preSurveyId={s.preSurveyId}
                        simulationId={sim.simulationId}
                        staleNote="Khách đã sửa mặt lắp sau lần chạy này; đo thực tế để chốt số tấm."
                      />
                    ) : (
                      <p className="text-body text-fg-2">Khách gửi yêu cầu khi chưa chạy mô phỏng.</p>
                    )}
                  </PanelBody>
                </Panel>
              </div>

              <PanelAside aria-label="Khách hàng" className="lg:sticky lg:top-16">
                <Panel>
                  <PanelHeader title="Khách hàng" />
                  <PanelBody>
                    <Facts
                      column
                      items={[
                        { k: 'Họ tên', v: job.customer.fullName || '—' },
                        {
                          k: 'Điện thoại',
                          v: job.customer.phone ? (
                            <a className="tnum ui-link" href={`tel:${job.customer.phone}`}>
                              {job.customer.phone}
                            </a>
                          ) : (
                            '—'
                          ),
                        },
                        {
                          k: 'Email',
                          v: job.customer.email ? (
                            <a className="ui-link wrap-anywhere" href={`mailto:${job.customer.email}`}>
                              {job.customer.email.split('@').map((part, i) =>
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
                <Panel>
                  <PanelHeader title="Ghi chú của khách" />
                  <PanelBody>
                    <p className="text-body text-fg-2">{job.customerNote || 'Không có ghi chú.'}</p>
                  </PanelBody>
                </Panel>
              </PanelAside>
            </div>
          </>
        )
      }}
    </QueryBoundary>
  )
}
