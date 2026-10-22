import { Fragment, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink, buttonClass } from '@/components/common/ui/button'
import { Field, Textarea } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { ProgressTracker, type TrackerNext, type TrackerStep } from '@/components/common/ui/progress-tracker'
import { Panel, PanelAside, PanelBody, PanelHeader } from '@/components/common/ui/panel'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { Facts } from '@/features/pre-surveys/Facts'
import {
  addressMapUrl,
  directionLabel,
  formatAddress,
  formatDateTime,
  shortCode,
} from '@/features/pre-surveys/preSurveyDisplay'
import { formatKwh, formatOne, mountingLabel } from '@/features/pre-surveys/simulationDisplay'
import { SimulationViewer } from '@/features/pre-surveys/SimulationViewer'
import {
  appointmentStatusMeta,
  formatAppointment,
  formatTimeRange,
  relativeDay,
  surfaceNameLabel,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import { OnSiteSurveyPanel } from '@/features/onsite-survey/OnSiteSurveyPanel'
import { surveyStartOpensAt } from '@/features/onsite-survey/onSiteSurveyDisplay'
import { useMyOnSiteSurveyQuery } from '@/hooks/useOnSiteSurvey'
import { useMyAppointmentQuery, useReleaseAppointmentMutation } from '@/hooks/useTechnicianJobs'
import { ROUTES } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { TechnicianJobView } from '@/types/res/technicianAppointmentsRes'
import type { OnSiteSurveyView } from '@/types/res/technicianOnSiteSurveyRes'

const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const n = (v: number | null | undefined) => (v == null ? '—' : num.format(v))

/** Lịch đã giao cho kỹ thuật viên này: được khảo sát và xem lại biên bản */
const WORKING_STATUSES = new Set(['ACCEPTED', 'ASSIGNED', 'COMPLETED'])

const ACCEPTED_BY: Record<string, string> = {
  SELF_ACCEPTED: 'Bạn tự nhận lịch này',
  SALES_ASSIGNED: 'Kinh doanh phân công lịch này cho bạn',
  MANAGER_OVERRIDE: 'Quản lý phân công lịch này cho bạn',
  MANAGER_DISPATCH: 'Quản lý điều phối lịch này cho bạn',
}

/** "Ngày mai, 09:00-10:30" */
function whenText(job: TechnicianJobView) {
  return `${relativeDay(vnDate(job.startsAt))}, ${formatTimeRange(job.startsAt, job.endsAt)}`
}

// Các bước của lịch theo góc nhìn kỹ thuật viên và việc tiếp theo. Đỏ khi tới lượt kỹ thuật viên làm
function jobTracker(
  job: TechnicianJobView,
  survey: OnSiteSurveyView | null | undefined,
  now: number,
): { steps: TrackerStep[]; next: TrackerNext } {
  const completed = job.status === 'COMPLETED' || survey?.status === 'COMPLETED'
  const started = completed || survey?.status === 'IN_PROGRESS'
  const steps: TrackerStep[] = [
    { label: 'Bạn nhận lịch', detail: formatDateTime(job.acceptedAt ?? job.assignedAt), state: 'done' },
    {
      label: 'Khảo sát tại công trình',
      detail: survey?.startedAt ? `Bắt đầu ${formatDateTime(survey.startedAt)}` : whenText(job),
      state: started ? 'done' : 'current',
    },
    {
      label: 'Hoàn thành biên bản',
      detail: survey?.completedAt ? formatDateTime(survey.completedAt) : undefined,
      state: completed ? 'done' : started ? 'current' : 'todo',
    },
  ]
  if (completed)
    return {
      steps,
      next: { tone: 'neutral', title: 'Đã khảo sát xong', body: 'Kết quả đã gửi cho bộ phận kinh doanh để báo giá.' },
    }
  if (started)
    return {
      steps,
      next: {
        tone: 'danger',
        title: 'Nhập số đo, chụp ảnh mái rồi hoàn thành khảo sát',
        body: 'Cần đủ các ô bắt buộc và ít nhất một ảnh Mái.',
      },
    }
  if (new Date(job.endsAt).getTime() < now)
    return {
      steps,
      next: {
        tone: 'warn',
        title: 'Đã qua giờ hẹn mà chưa bắt đầu khảo sát',
        body: 'Tới công trình thì bấm Bắt đầu khảo sát, hoặc báo bộ phận kinh doanh đổi giờ.',
      },
    }
  const call = job.customer.phone ? `Gọi khách ${job.customer.phone} trước khi tới. ` : ''
  if (now >= surveyStartOpensAt(job.startsAt).getTime())
    return {
      steps,
      next: { tone: 'danger', title: 'Tới giờ hẹn: bấm Bắt đầu khảo sát khi đến công trình', body: call || undefined },
    }
  return {
    steps,
    next: {
      tone: 'info',
      title: `Khảo sát tại công trình: ${whenText(job)}`,
      body: `${call}Mang theo số liệu khách khai bên dưới để đối chiếu.`,
    },
  }
}

// Lịch đã nhận. Bận thì trả lại (lý do bắt buộc), lịch quay về chờ kỹ thuật viên khác trong khu vực nhận
function JobActions({ job }: { job: TechnicianJobView }) {
  const release = useReleaseAppointmentMutation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => Date.now())
  const upcoming = new Date(job.startsAt).getTime() > now
  const source = job.assignmentSource
    ? (ACCEPTED_BY[job.assignmentSource] ?? 'Bạn đã nhận lịch này')
    : 'Bạn đã nhận lịch này'

  async function submit() {
    if (!reason.trim()) {
      setError('Ghi lý do trả lại việc.')
      return
    }
    try {
      await release.mutateAsync({ id: job.appointmentId, reason: reason.trim() })
      toast.success('Đã trả lại việc. Lịch quay về chờ kỹ thuật viên khác nhận.')
      navigate(ROUTES.tech.jobs)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-fg-2">
          {source} lúc {formatDateTime(job.acceptedAt ?? job.assignedAt)}.
        </p>
        <span className="flex flex-wrap gap-3">
          <ButtonLink
            variant="info"
            to={`${ROUTES.tech.schedule}?ngay=${vnDate(job.startsAt)}`}
            size="sm"
            icon="calendar_month"
          >
            Lịch cả ngày
          </ButtonLink>
          {upcoming && !open && (
            <Button size="sm" variant="warn" icon="undo" onClick={() => setOpen(true)}>
              Trả lại việc
            </Button>
          )}
        </span>
      </div>
      {open && (
        <span className="mt-4 block space-y-3">
          <Field label="Lý do trả lại" htmlFor="release-reason" required>
            <Textarea
              id="release-reason"
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError(null)
              }}
            />
          </Field>
          <span className="flex flex-wrap items-center gap-3">
            <Button
              icon="close"
              size="sm"
              variant="secondary"
              disabled={release.isPending}
              onClick={() => setOpen(false)}
            >
              Huỷ
            </Button>
            <Button icon="undo" size="sm" variant="danger" disabled={release.isPending} onClick={() => void submit()}>
              {release.isPending ? 'Đang trả lại…' : 'Xác nhận trả lại'}
            </Button>
            {error && (
              <span className="flex items-center gap-1.5 text-body font-medium text-danger" role="alert">
                <Icon name="error" className="shrink-0 text-[20px]" />
                {error}
              </span>
            )}
          </span>
        </span>
      )}
    </div>
  )
}

// Chi tiết một lịch khảo sát đã nhận: bắt đầu, ghi biên bản và hoàn thành khảo sát tại công trình
export function TechJobPage() {
  const { id } = useParams()
  const query = useMyAppointmentQuery(id)
  // Cùng cache với khối khảo sát nên không gọi thêm lần nào
  const surveyQuery = useMyOnSiteSurveyQuery(query.data?.appointmentId, {
    enabled: query.data ? WORKING_STATUSES.has(query.data.status) : false,
  })
  const [now] = useState(() => Date.now())
  usePageCrumb(query.data?.property.name ?? null)

  return (
    <QueryBoundary query={query}>
      {(job) => {
        const status = appointmentStatusMeta(job.status, 'technician')
        const p = job.property
        const map = addressMapUrl(formatAddress(p))
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
                    <a className={buttonClass('soft')} href={`tel:${job.customer.phone}`}>
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

            <ProgressTracker {...jobTracker(job, surveyQuery.data, now)} />

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
                {WORKING_STATUSES.has(job.status) && <OnSiteSurveyPanel job={job} />}

                {(job.status === 'ACCEPTED' || job.status === 'ASSIGNED') &&
                  surveyQuery.data?.status !== 'IN_PROGRESS' && (
                    <Panel>
                      <PanelHeader title="Lịch của bạn" />
                      <PanelBody>
                        <JobActions job={job} />
                      </PanelBody>
                    </Panel>
                  )}

                <Panel>
                  <PanelHeader title="Công trình" />
                  <PanelBody>
                    <Facts
                      items={[
                        { k: 'Địa chỉ', v: formatAddress(p) },
                        { k: 'Bề mặt', v: surfaceNameLabel(p.installationSurfaceType) },
                        { k: 'Vật liệu', v: p.surfaceMaterial || '—' },
                      ]}
                    />
                  </PanelBody>
                </Panel>

                <Panel>
                  <PanelHeader title="Số liệu khách khai" description="Đo lại tại công trình để đối chiếu." />
                  <PanelBody>
                    <StatRow className="lg:grid-cols-5">
                      <Stat
                        label="Mặt lắp (rộng × dài)"
                        value={s.surfaceWidthM == null ? '—' : `${n(s.surfaceWidthM)} × ${n(s.surfaceLengthM)}`}
                        unit="m"
                      />
                      <Stat label="Dùng được / tổng" value={`${n(s.usableAreaM2)} / ${n(s.totalAreaM2)}`} unit="m²" />
                      <Stat label="Độ dốc" value={n(s.surfaceTiltDegree)} unit="độ" />
                      <Stat
                        label="Hướng mái"
                        value={n(s.surfaceAzimuthDegree)}
                        unit={
                          s.surfaceAzimuthDegree == null ? undefined : `độ, ${directionLabel(s.surfaceAzimuthDegree)}`
                        }
                      />
                      <Stat
                        label="Vật cản"
                        value={s.obstacleCount > 0 ? s.obstacleCount : s.hasObstruction ? 'Có' : 'Không'}
                        unit={s.obstacleCount > 0 ? 'vật cản' : undefined}
                      />
                    </StatRow>
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

            {/* Mô phỏng trải hết chiều ngang để hình bố trí to và không chừa cột trống bên phải */}
            <Panel className="mt-6">
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
          </>
        )
      }}
    </QueryBoundary>
  )
}
