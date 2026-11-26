import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink, IconButton, buttonClass } from '@/components/common/ui/button'
import { Field, Textarea } from '@/components/common/ui/field'
import { KeyValueList } from '@/components/common/ui/lists'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { ProgressTracker, type TrackerNext, type TrackerStep } from '@/components/common/ui/progress-tracker'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { usePageCrumb } from '@/components/layout/page-crumb'
import {
  addressMapUrl,
  directionLabel,
  formatAddress,
  formatAreaPair,
  surfaceTypeLabel,
} from '@/features/pre-surveys/preSurveyDisplay'
import { formatKwh, formatOne, mountingLabel } from '@/features/pre-surveys/simulationDisplay'
import { SimulationViewer } from '@/features/pre-surveys/SimulationViewer'
import {
  DAY_STYLES,
  assignmentSourceLabel,
  formatMoment,
  formatTime,
  technicianProgressMeta,
  vnDate,
  weekdayOf,
} from '@/features/scheduling/schedulingDisplay'
import { OnSiteSurveyPanel } from '@/features/onsite-survey/OnSiteSurveyPanel'
import { TechnicianQuotationPanel } from '@/features/quotations/TechnicianQuotationPanel'
import { useMyOnSiteSurveyQuery, useStartOnSiteSurveyMutation } from '@/hooks/useOnSiteSurvey'
import { useMyAppointmentQuery, useReleaseAppointmentMutation } from '@/hooks/useTechnicianJobs'
import { ROUTES } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { TechnicianJobView } from '@/types/res/technicianAppointmentsRes'

const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const n = (v: number | null | undefined) => (v == null ? '—' : num.format(v))

const WORKING_STATUSES = new Set(['ACCEPTED', 'ASSIGNED', 'COMPLETED'])

function formatJobId(appointmentId: string) {
  const code = appointmentId.length > 8 ? appointmentId.slice(0, 8).toUpperCase() : appointmentId.toUpperCase()
  return `#${code}`
}

function formatDuration(startsAt: string, endsAt: string) {
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  const diffMinutes = Math.round((end - start) / 60000)
  return diffMinutes > 0 ? `${diffMinutes} phút` : ''
}

function ReleaseJobDialog({ job, open, onClose }: { job: TechnicianJobView; open: boolean; onClose: () => void }) {
  const release = useReleaseAppointmentMutation()
  const navigate = useNavigate()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  if (!open) return null

  return (
    <div className="mt-4 space-y-3 rounded-container bg-warn-soft p-4">
      <p className="text-body font-semibold text-fg">Xác nhận trả lại hoặc đổi lịch</p>
      <Field label="Lý do trả lại công việc" htmlFor="release-reason" required>
        <Textarea
          id="release-reason"
          rows={2}
          maxLength={500}
          placeholder="Nhập lý do bận, trùng lịch hoặc đổi giờ..."
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            setError(null)
          }}
        />
      </Field>
      {error && (
        <p className="text-meta font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" icon="close" disabled={release.isPending} onClick={onClose}>
          Huỷ
        </Button>
        <Button variant="danger" size="sm" icon="undo" disabled={release.isPending} onClick={() => void submit()}>
          {release.isPending ? 'Đang gửi…' : 'Xác nhận trả lại'}
        </Button>
      </div>
    </div>
  )
}

export function TechJobPage() {
  const { id } = useParams()
  const query = useMyAppointmentQuery(id)
  const surveyQuery = useMyOnSiteSurveyQuery(query.data?.appointmentId, {
    enabled: query.data ? WORKING_STATUSES.has(query.data.status) : false,
  })
  const startMutation = useStartOnSiteSurveyMutation(query.data?.appointmentId ?? '')
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [now] = useState(() => Date.now())

  usePageCrumb(query.data?.property.name ?? null)

  return (
    <QueryBoundary query={query}>
      {(job) => {
        const p = job.property
        const s = job.preSurvey
        const sim = job.selectedSimulation
        const map = addressMapUrl(formatAddress(p))
        const progress = technicianProgressMeta(job, now)
        const upcoming = now < new Date(job.startsAt).getTime()

        const w = weekdayOf(job.startsAt)
        const dayStyle = DAY_STYLES[w]
        const dayName = dayStyle?.name ?? ''
        const [yearStr, monthStr, dateStr] = vnDate(job.startsAt).split('-')
        const formattedDate = `${dayName ? `${dayName}, ` : ''}${dateStr}/${monthStr}/${yearStr}`
        const timeRangeFormatted = `${formatTime(job.startsAt)} – ${formatTime(job.endsAt)}`
        const durationText = formatDuration(job.startsAt, job.endsAt)
        const isSelf = job.assignmentSource === 'SELF_ACCEPTED'
        const assignmentLabel = isSelf
          ? 'Bạn tự nhận lịch'
          : assignmentSourceLabel(job.assignmentSource, 'technician') || 'Được phân công cho bạn'
        const customerPhone = job.customer.phone
        const telHref = customerPhone ? `tel:${customerPhone}` : undefined

        const survey = surveyQuery.data
        const isSurveyCompleted = job.status === 'COMPLETED' || survey?.status === 'COMPLETED'
        const isSurveyStarted = isSurveyCompleted || survey?.status === 'IN_PROGRESS'

        async function handleStartSurvey() {
          try {
            await startMutation.mutateAsync()
            toast.success('Đã vào ca khảo sát tại công trình. Nhập số đo và tải ảnh bên dưới.')
          } catch (e) {
            toast.error(errorMessage(e))
          }
        }

        const overdue = progress.tone === 'danger'
        const steps: TrackerStep[] = [
          { label: 'Nhận lịch', detail: formatMoment(job.acceptedAt ?? job.assignedAt), state: 'done' },
          {
            label: 'Khảo sát tại công trình',
            detail: `${dateStr}/${monthStr}, ${timeRangeFormatted}`,
            state: isSurveyCompleted ? 'done' : 'current',
          },
          { label: 'Hoàn thành biên bản', state: isSurveyCompleted ? 'done' : 'todo' },
        ]
        const next: TrackerNext = isSurveyCompleted
          ? { tone: 'ok', title: 'Đã hoàn thành khảo sát', body: 'Lập báo giá cho khách ở khối Báo giá bên dưới.' }
          : isSurveyStarted
            ? {
                tone: 'danger',
                title: 'Nhập số đo, chụp ảnh mái rồi hoàn thành khảo sát',
                action: { label: 'Tới biên bản', icon: 'edit_note', target: 'survey-section' },
              }
            : {
                tone: upcoming ? 'info' : 'danger',
                title: overdue ? 'Đã qua giờ hẹn mà chưa bắt đầu khảo sát' : 'Tới công trình và bắt đầu khảo sát',
                body: 'Gọi khách trước khi tới ít nhất 15 phút và mang theo số liệu khách khai để đối chiếu.',
                action: { label: 'Tới khối khảo sát', icon: 'play_arrow', target: 'survey-section' },
              }

        return (
          <div className="space-y-6">
            <PageHeader
              meta={
                <>
                  {/* Quá giờ đã báo đỏ ở khối Tình hình */}
                  <Badge tone={overdue ? 'neutral' : progress.tone}>{progress.label}</Badge>
                  <span className="tnum">Mã {formatJobId(job.appointmentId)}</span>
                  <span>{assignmentLabel}</span>
                </>
              }
              title={p.name}
              description={
                <span className="tnum">
                  {formattedDate}, {timeRangeFormatted}
                  {durationText ? ` (${durationText})` : ''}
                </span>
              }
              actions={
                <>
                  {telHref && (
                    <a className={buttonClass('soft')} href={telHref}>
                      <Icon name="call" className="-ml-0.5 text-[20px]" />
                      Gọi khách
                    </a>
                  )}
                  {map && (
                    <a className={buttonClass('info')} href={map} target="_blank" rel="noreferrer">
                      <Icon name="map" className="-ml-0.5 text-[20px]" />
                      Xem bản đồ
                    </a>
                  )}
                  <IconButton variant="secondary" icon="print" label="In phiếu" onClick={() => window.print()} />
                </>
              }
            />

            <ProgressTracker steps={steps} next={next} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                {!isSurveyStarted ? (
                  <Panel raised id="survey-section">
                    <PanelHeader title="Khảo sát tại công trình" />
                    <PanelBody className="space-y-4">
                      <p className="text-body text-fg-2">
                        Tới công trình thì bấm Bắt đầu khảo sát để ghi giờ bắt đầu. Sau đó nhập số đo, chụp ít nhất một
                        ảnh mái rồi bấm Hoàn thành khảo sát.
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        {/* Không tự khoá theo giờ: số phút được bắt đầu sớm do quản trị đặt, backend kiểm khi bấm */}
                        <Button
                          variant="primary"
                          icon="play_arrow"
                          disabled={startMutation.isPending}
                          onClick={() => void handleStartSurvey()}
                        >
                          {startMutation.isPending ? 'Đang bắt đầu…' : 'Bắt đầu khảo sát'}
                        </Button>
                      </div>
                    </PanelBody>
                    <PanelFooter className="justify-between border-t border-line pt-4">
                      <span className="text-meta text-fg-2">
                        {assignmentLabel} lúc {formatMoment(job.acceptedAt ?? job.assignedAt)}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <ButtonLink
                          variant="info"
                          size="sm"
                          icon="calendar_month"
                          to={`${ROUTES.tech.schedule}?ngay=${vnDate(job.startsAt)}`}
                        >
                          Lịch cả ngày
                        </ButtonLink>
                        <Button variant="warn" size="sm" icon="undo" onClick={() => setReleaseOpen(true)}>
                          Trả lại việc
                        </Button>
                      </div>
                    </PanelFooter>
                    <ReleaseJobDialog job={job} open={releaseOpen} onClose={() => setReleaseOpen(false)} />
                  </Panel>
                ) : (
                  WORKING_STATUSES.has(job.status) && <OnSiteSurveyPanel job={job} />
                )}

                {isSurveyCompleted && survey?.status === 'COMPLETED' && (
                  <Panel raised>
                    <TechnicianQuotationPanel
                      surveyRequestId={job.surveyRequestId}
                      feasibility={survey.data.installationFeasibility}
                      billOfMaterials={survey.data.billOfMaterials}
                    />
                  </Panel>
                )}

                <Panel raised>
                  <PanelHeader
                    title="Công trình"
                    action={
                      map && (
                        <a href={map} target="_blank" rel="noreferrer" className="ui-link text-meta">
                          Mở bản đồ
                        </a>
                      )
                    }
                  />
                  <KeyValueList
                    columns={2}
                    items={[
                      { k: 'Địa chỉ', v: formatAddress(p) || '—' },
                      { k: 'Loại bề mặt lắp', v: surfaceTypeLabel(p.installationSurfaceType) || '—' },
                      { k: 'Vật liệu mái', v: p.surfaceMaterial || '—' },
                      {
                        k: 'Toạ độ',
                        v: p.latitude && p.longitude ? `${p.latitude}, ${p.longitude}` : 'Chưa lưu toạ độ',
                      },
                    ]}
                  />
                </Panel>

                <Panel raised>
                  <PanelHeader title="Số liệu khách khai" />
                  {!s.preSurveyId ? (
                    <p className="text-body text-fg-2">
                      Khách đặt khảo sát trực tiếp, không qua đánh giá sơ bộ nên không có số liệu khai trước. Đo toàn bộ
                      tại công trình.
                    </p>
                  ) : (
                    <KeyValueList
                      columns={2}
                      items={[
                        {
                          k: 'Kích thước mặt lắp',
                          v: s.surfaceWidthM == null ? '—' : `${n(s.surfaceWidthM)} × ${n(s.surfaceLengthM)} m`,
                        },
                        { k: 'Diện tích dùng được / tổng', v: formatAreaPair(s.usableAreaM2, s.totalAreaM2) },
                        { k: 'Độ dốc mái', v: s.surfaceTiltDegree == null ? '—' : `${n(s.surfaceTiltDegree)} độ` },
                        {
                          k: 'Hướng mái',
                          v:
                            s.surfaceAzimuthDegree == null
                              ? '—'
                              : `${n(s.surfaceAzimuthDegree)} độ (${directionLabel(s.surfaceAzimuthDegree)})`,
                        },
                        {
                          k: 'Vật cản trên mái',
                          v: s.obstacleCount > 0 ? `${s.obstacleCount} vật cản` : s.hasObstruction ? 'Có' : 'Không có',
                        },
                      ]}
                    />
                  )}
                </Panel>
              </div>

              <Panel raised className="self-start">
                <PanelHeader title="Khách hàng" />
                <KeyValueList
                  items={[
                    { k: 'Họ tên', v: job.customer.fullName || '—' },
                    {
                      k: 'Điện thoại',
                      v: customerPhone ? (
                        <a className="tnum ui-link" href={`tel:${customerPhone}`}>
                          {customerPhone}
                        </a>
                      ) : (
                        'Chưa có số điện thoại'
                      ),
                    },
                    { k: 'Email', v: <span className="break-all">{job.customer.email || '—'}</span> },
                    ...(job.onSiteContact
                      ? [
                          {
                            k: 'Người gặp tại công trình',
                            v: (
                              <>
                                {job.onSiteContact.name || 'Chưa ghi tên'}
                                {job.onSiteContact.phone && (
                                  <a className="tnum ui-link block" href={`tel:${job.onSiteContact.phone}`}>
                                    {job.onSiteContact.phone}
                                  </a>
                                )}
                              </>
                            ),
                          },
                        ]
                      : []),
                    ...(job.customerNote
                      ? [{ k: 'Ghi chú của khách', v: <span className="whitespace-pre-line">{job.customerNote}</span> }]
                      : []),
                  ]}
                />
              </Panel>
            </div>

            {sim && s.preSurveyId && (
              <Panel raised>
                <PanelHeader
                  title="Mô phỏng khách chọn"
                  description={`${mountingLabel(sim.mountingType)}, ${sim.productName}: ${sim.panelCount} tấm, ${formatOne(sim.installedCapacityKwp)} kWp${sim.annualEnergyKwh != null ? `, ${formatKwh(sim.annualEnergyKwh)} kWh/năm` : ''}`}
                />
                <SimulationViewer
                  preSurveyId={s.preSurveyId}
                  simulationId={sim.simulationId}
                  staleNote="Khách đã sửa mặt lắp sau lần chạy này; đo thực tế để chốt số tấm."
                />
              </Panel>
            )}
          </div>
        )
      }}
    </QueryBoundary>
  )
}
