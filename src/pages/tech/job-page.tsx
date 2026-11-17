import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { Field, Textarea } from '@/components/common/ui/field'
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
import { surveyStartOpensAt } from '@/features/onsite-survey/onSiteSurveyDisplay'
import { useMyOnSiteSurveyQuery, useStartOnSiteSurveyMutation } from '@/hooks/useOnSiteSurvey'
import { useMyAppointmentQuery, useReleaseAppointmentMutation } from '@/hooks/useTechnicianJobs'
import { ROUTES } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { TechnicianJobView } from '@/types/res/technicianAppointmentsRes'
import { cx } from '@/utils/cx'

const num = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const n = (v: number | null | undefined) => (v == null ? '—' : num.format(v))

const WORKING_STATUSES = new Set(['ACCEPTED', 'ASSIGNED', 'COMPLETED'])

function getInitials(name: string) {
  if (!name.trim()) return 'KH'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function customerCode(surveyRequestId: string) {
  const code = surveyRequestId.length > 4 ? surveyRequestId.slice(-4).toUpperCase() : surveyRequestId
  return `#KH-${code || '9832'}`
}

function formatJobId(appointmentId: string) {
  const code = appointmentId.length > 8 ? appointmentId.slice(0, 8).toUpperCase() : appointmentId.toUpperCase()
  return `#${code}`
}

function formatDuration(startsAt: string, endsAt: string) {
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  const diffMinutes = Math.round((end - start) / 60000)
  return diffMinutes > 0 ? `${diffMinutes} phút` : '90 phút'
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
    <div className="rounded-control border border-warn/40 bg-warn-soft/20 p-4 space-y-3">
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
        const opensAt = surveyStartOpensAt(job.startsAt)
        const tooEarly = now < opensAt.getTime()

        const w = weekdayOf(job.startsAt)
        const dayStyle = DAY_STYLES[w]
        const dayName = dayStyle ? dayStyle.name : 'Thứ Hai'
        const [yearStr, monthStr, dateStr] = vnDate(job.startsAt).split('-')
        const formattedDate = `${dayName}, ${dateStr}/${monthStr}/${yearStr}`
        const timeRangeFormatted = `${formatTime(job.startsAt)} – ${formatTime(job.endsAt)}`
        const durationText = `Thời lượng dự kiến: ${formatDuration(job.startsAt, job.endsAt)}`
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

        return (
          <div className="space-y-6">
            {/* Thanh điều hướng breadcrumb và nút hành động trên cùng */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <nav
                aria-label="Đường dẫn điều hướng"
                className="flex flex-wrap items-center gap-1.5 text-meta text-fg-3"
              >
                <span>Kỹ thuật hiện trường</span>
                <Icon name="chevron_right" className="text-[16px] text-fg-3" />
                <span>Tác vụ kỹ thuật</span>
                <Icon name="chevron_right" className="text-[16px] text-fg-3" />
                <Link to={ROUTES.tech.jobs} className="hover:text-fg">
                  Khảo sát
                </Link>
                <Icon name="chevron_right" className="text-[16px] text-fg-3" />
                <span className="font-semibold text-fg">{p.name}</span>
              </nav>

              <div className="flex flex-wrap items-center gap-2">
                {telHref && (
                  <a
                    href={telHref}
                    className="press inline-flex h-9 items-center gap-1.5 rounded-control border border-ok/40 bg-ok-soft/30 px-3 text-meta font-medium text-ok hover:bg-ok-soft/50"
                  >
                    <Icon name="call" className="text-[16px]" />
                    Gọi khách
                  </a>
                )}
                {map && (
                  <a
                    href={map}
                    target="_blank"
                    rel="noreferrer"
                    className="press inline-flex h-9 items-center gap-1.5 rounded-control border border-line-2 bg-canvas px-3 text-meta font-medium text-fg hover:bg-surface-2"
                  >
                    <Icon name="map" className="text-[16px]" />
                    Xem bản đồ
                  </a>
                )}
                <ButtonLink to={ROUTES.tech.jobs} variant="secondary" size="sm" icon="arrow_back">
                  Danh sách
                </ButtonLink>
              </div>
            </div>

            {/* Khối tiêu đề chính của công việc */}
            <div className="rounded-container border border-line bg-canvas p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-control bg-ok-soft px-2.5 py-0.5 text-meta font-medium text-ok">
                      <span className="size-1.5 rounded-full bg-ok" />
                      {assignmentLabel}
                    </span>
                    <span className="rounded-control bg-surface-2 px-2.5 py-0.5 font-mono text-meta text-fg-3">
                      Mã {formatJobId(job.appointmentId)}
                    </span>
                    <span className="rounded-control bg-warn-soft px-2.5 py-0.5 text-meta font-medium text-warn">
                      {progress.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-3">
                    <h1 className="text-display font-bold text-fg">{p.name}</h1>
                    <span className="rounded-control bg-surface-2 px-2.5 py-1 text-meta font-medium text-fg-2">
                      {surfaceTypeLabel(p.installationSurfaceType) || 'Biệt thự gia đình'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-fg-2">
                    <div className="flex items-center gap-1.5">
                      <Icon name="calendar_today" className="text-[16px] text-fg-3" />
                      <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Icon name="schedule" className="text-[16px] text-fg-3" />
                      <span className="tnum font-medium text-fg">{timeRangeFormatted}</span>
                    </div>
                    <span className="size-1 rounded-full bg-fg-3" />
                    <span>{durationText}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isSurveyCompleted && (
                    <Button
                      variant="primary"
                      size="md"
                      icon="play_arrow"
                      disabled={tooEarly || startMutation.isPending}
                      onClick={() => void handleStartSurvey()}
                    >
                      {startMutation.isPending
                        ? 'Đang vào ca…'
                        : isSurveyStarted
                          ? 'Tiếp tục khảo sát'
                          : 'Vào ca khảo sát'}
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    aria-label="In phiếu"
                    className="press inline-flex size-11 items-center justify-center rounded-control border border-line-2 bg-canvas text-fg hover:bg-surface-2 lg:size-9"
                  >
                    <Icon name="print" className="text-[20px]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Thẻ hiển thị TIẾN ĐỘ QUY TRÌNH CÔNG VIỆC */}
            <div className="rounded-container border border-line bg-canvas p-5 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-meta font-semibold uppercase text-fg-3">TIẾN ĐỘ QUY TRÌNH CÔNG VIỆC</span>
                <span className="rounded-control bg-ok-soft px-2.5 py-1 text-meta font-medium text-ok">
                  {isSurveyCompleted ? 'Bước 3 / 3 Đang thực hiện' : 'Bước 2 / 3 Đang thực hiện'}
                </span>
              </div>

              <div className="relative">
                {/* Thanh kết nối giữa các bước */}
                <div className="absolute top-4 left-6 right-6 hidden md:block">
                  <div className="grid grid-cols-2">
                    <div className="h-1 w-full bg-ok" />
                    <div className={cx('h-1 w-full', isSurveyCompleted ? 'bg-ok' : 'bg-line-2')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Bước 1 */}
                  <div className="relative flex flex-col items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ok text-on-accent font-bold ring-4 ring-canvas">
                      <Icon name="check" className="text-[20px]" />
                    </div>
                    <div>
                      <p className="text-body font-semibold text-fg">Bạn nhận lịch</p>
                      <p className="text-meta text-fg-3">{formatMoment(job.acceptedAt ?? job.assignedAt)}</p>
                    </div>
                  </div>

                  {/* Bước 2 */}
                  <div className="relative flex flex-col items-start gap-3">
                    <div
                      className={cx(
                        'flex size-8 shrink-0 items-center justify-center rounded-full font-bold ring-4 ring-canvas',
                        isSurveyCompleted ? 'bg-ok text-on-accent' : 'border-2 border-ok bg-canvas text-ok',
                      )}
                    >
                      {isSurveyCompleted ? <Icon name="check" className="text-[20px]" /> : '2'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-body font-semibold text-fg">Khảo sát tại công trình</p>
                        {!isSurveyStarted && (
                          <span className="rounded-control bg-warn-soft px-1.5 py-0.5 text-meta font-medium text-warn">
                            Chưa bắt đầu
                          </span>
                        )}
                      </div>
                      <p className="text-meta text-fg-3">
                        {dayName}, {dateStr}/{monthStr} , {timeRangeFormatted}
                      </p>
                    </div>
                  </div>

                  {/* Bước 3 */}
                  <div className="relative flex flex-col items-start gap-3">
                    <div
                      className={cx(
                        'flex size-8 shrink-0 items-center justify-center rounded-full font-bold ring-4 ring-canvas',
                        isSurveyCompleted ? 'bg-ok text-on-accent' : 'border-2 border-line bg-canvas text-fg-3',
                      )}
                    >
                      {isSurveyCompleted ? <Icon name="check" className="text-[20px]" /> : '3'}
                    </div>
                    <div>
                      <p className={cx('text-body font-semibold', isSurveyCompleted ? 'text-fg' : 'text-fg-3')}>
                        Hoàn thành biên bản
                      </p>
                      <p className="text-meta text-fg-3">
                        {isSurveyCompleted ? 'Đã hoàn tất báo cáo' : 'Chờ kết quả khảo sát'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hộp nhắc nhở "Lưu ý trước khi đi" */}
            <div className="flex flex-col justify-between gap-4 rounded-container border border-info/30 bg-info-soft/40 p-4 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info text-on-accent">
                  <Icon name="info" className="text-[20px]" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-bold text-fg">
                      Khảo sát tại công trình: {formattedDate}, {timeRangeFormatted}
                    </span>
                    <span className="rounded-control bg-info-soft px-2 py-0.5 text-meta font-medium text-info">
                      Lưu ý trước khi đi
                    </span>
                  </div>
                  <p className="text-meta text-fg-2">
                    Gọi khách{' '}
                    {customerPhone ? (
                      <a href={telHref} className="font-semibold text-info hover:underline">
                        {customerPhone}
                      </a>
                    ) : (
                      'khách hàng'
                    )}{' '}
                    trước khi tới tối thiểu 15 phút. Mang theo các số liệu khách khai bên dưới để đối chiếu mặt bằng
                    mái.
                  </p>
                </div>
              </div>

              {telHref && (
                <a
                  href={telHref}
                  className="press inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control bg-info px-4 py-2 text-meta font-medium text-on-accent hover:opacity-90"
                >
                  <Icon name="call" className="text-[16px]" />
                  Gọi xác nhận ngay
                </a>
              )}
            </div>

            {/* Bố cục nội dung chính 2 cột: Cột trái 2/3, Cột phải 1/3 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* CỘT TRÁI (2/3) */}
              <div className="space-y-6 lg:col-span-2">
                {/* Khối khảo sát tại công trình */}
                {!isSurveyStarted ? (
                  <div id="survey-section" className="rounded-container border border-line bg-canvas p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-title font-bold text-fg">Khảo sát tại công trình</h2>
                        <span className="rounded-control bg-warn-soft px-2 py-0.5 text-meta font-medium text-warn">
                          Chưa bắt đầu
                        </span>
                      </div>
                    </div>

                    <p className="text-body text-fg-2">
                      Tới công trình thì bấm Bắt đầu khảo sát để ghi giờ bắt đầu. Sau đó nhập số đo, chụp ít nhất một
                      ảnh mái rồi bấm Hoàn thành khảo sát.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant="primary"
                        size="md"
                        icon="play_arrow"
                        disabled={tooEarly || startMutation.isPending}
                        onClick={() => void handleStartSurvey()}
                      >
                        {startMutation.isPending ? 'Đang vào ca…' : 'Bắt đầu khảo sát'}
                      </Button>
                      <div className="flex items-center gap-1.5 rounded-control border border-line bg-surface-2 px-3 py-1.5 text-meta text-fg-2">
                        <Icon name="schedule" className="text-[16px] text-fg-3" />
                        <span>
                          Bắt đầu được từ {vnDate(opensAt.toISOString()).split('-').reverse().join('/')}{' '}
                          {formatTime(opensAt.toISOString())} (tức 2 giờ trước giờ hẹn)
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-line pt-4 flex flex-wrap items-center justify-between gap-3 text-meta text-fg-3">
                      <span>
                        Quản lý điều phối lịch này cho bạn lúc {formatMoment(job.acceptedAt ?? job.assignedAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        <ButtonLink
                          variant="secondary"
                          to={`${ROUTES.tech.schedule}?ngay=${vnDate(job.startsAt)}`}
                          size="sm"
                          icon="calendar_month"
                        >
                          Lịch cả ngày
                        </ButtonLink>
                        <Button variant="secondary" size="sm" icon="undo" onClick={() => setReleaseOpen(true)}>
                          Trả lại việc / Đổi lịch
                        </Button>
                      </div>
                    </div>

                    <ReleaseJobDialog job={job} open={releaseOpen} onClose={() => setReleaseOpen(false)} />
                  </div>
                ) : (
                  WORKING_STATUSES.has(job.status) && <OnSiteSurveyPanel job={job} />
                )}

                {isSurveyCompleted && survey?.status === 'COMPLETED' && (
                  <div className="rounded-container border border-line bg-canvas p-4">
                    <TechnicianQuotationPanel
                      surveyRequestId={job.surveyRequestId}
                      feasibility={survey.data.installationFeasibility}
                      billOfMaterials={survey.data.billOfMaterials}
                    />
                  </div>
                )}

                {/* Khối Thông tin công trình */}
                <div className="rounded-container border border-line bg-canvas p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-control bg-ok-soft text-ok">
                        <Icon name="apartment" className="text-[20px]" />
                      </div>
                      <div>
                        <h2 className="text-title font-bold text-fg">Thông tin công trình</h2>
                        <p className="text-meta text-fg-3">Vị trí địa lý và loại hình kiến trúc mái</p>
                      </div>
                    </div>
                    {map && (
                      <a
                        href={map}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-meta font-medium text-ok hover:underline"
                      >
                        <span>Mở Google Maps</span>
                        <Icon name="open_in_new" className="text-[16px]" />
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-meta text-fg-3">Địa chỉ công trình</p>
                      <p className="mt-0.5 text-body font-semibold text-fg">{formatAddress(p)}</p>
                    </div>
                    <div>
                      <p className="text-meta text-fg-3">Loại bề mặt lắp đặt</p>
                      <p className="mt-0.5 text-body font-semibold text-fg">
                        {surfaceTypeLabel(p.installationSurfaceType)}
                      </p>
                    </div>
                    <div>
                      <p className="text-meta text-fg-3">Vật liệu mái</p>
                      <p className="mt-0.5 text-body font-semibold text-fg">
                        {p.surfaceMaterial || 'Bê tông cốt thép'}
                      </p>
                    </div>
                    <div>
                      <p className="text-meta text-fg-3">Toạ độ định vị</p>
                      <p className="mt-0.5 text-body font-semibold text-fg">
                        {p.latitude && p.longitude ? `${p.latitude}, ${p.longitude}` : 'Chưa lưu toạ độ'}
                      </p>
                    </div>
                  </div>
                </div>

                {!s.preSurveyId ? (
                  <div className="rounded-container border border-line bg-canvas p-4">
                    <h2 className="text-title font-bold text-fg">Số liệu khách khai</h2>
                    <p className="mt-1 text-body text-fg-2">
                      Khách đặt khảo sát trực tiếp, không qua đánh giá sơ bộ nên không có số liệu khai trước. Đo toàn bộ
                      tại công trình.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-container border border-line bg-canvas p-5 space-y-4">
                    <div className="border-b border-line pb-3">
                      <h2 className="text-title font-bold text-fg">Số liệu khách khai</h2>
                      <p className="text-meta text-fg-3">Thông số đối chiếu khảo sát sơ bộ</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-meta text-fg-3">Kích thước mặt lắp</p>
                        <p className="mt-0.5 text-body font-semibold text-fg">
                          {s.surfaceWidthM == null ? '—' : `${n(s.surfaceWidthM)} × ${n(s.surfaceLengthM)} m`}
                        </p>
                      </div>
                      <div>
                        <p className="text-meta text-fg-3">Diện tích khả dụng / tổng</p>
                        <p className="mt-0.5 text-body font-semibold text-fg">
                          {formatAreaPair(s.usableAreaM2, s.totalAreaM2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-meta text-fg-3">Độ dốc mái</p>
                        <p className="mt-0.5 text-body font-semibold text-fg">
                          {s.surfaceTiltDegree == null ? '—' : `${n(s.surfaceTiltDegree)} độ`}
                        </p>
                      </div>
                      <div>
                        <p className="text-meta text-fg-3">Hướng mái</p>
                        <p className="mt-0.5 text-body font-semibold text-fg">
                          {s.surfaceAzimuthDegree == null
                            ? '—'
                            : `${n(s.surfaceAzimuthDegree)} độ (${directionLabel(s.surfaceAzimuthDegree)})`}
                        </p>
                      </div>
                      <div>
                        <p className="text-meta text-fg-3">Vật cản trên mái</p>
                        <p className="mt-0.5 text-body font-semibold text-fg">
                          {s.obstacleCount > 0 ? `${s.obstacleCount} vật cản` : s.hasObstruction ? 'Có' : 'Không có'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {sim && s.preSurveyId && (
                  <div className="rounded-container border border-line bg-canvas p-5 space-y-4">
                    <div className="border-b border-line pb-3">
                      <h2 className="text-title font-bold text-fg">Mô phỏng khách chọn</h2>
                      <p className="text-meta text-fg-3">
                        {mountingLabel(sim.mountingType)}, {sim.productName}: {sim.panelCount} tấm,{' '}
                        {formatOne(sim.installedCapacityKwp)} kWp
                        {sim.annualEnergyKwh != null ? `, ${formatKwh(sim.annualEnergyKwh)} kWh/năm` : ''}
                      </p>
                    </div>

                    <SimulationViewer
                      preSurveyId={s.preSurveyId}
                      simulationId={sim.simulationId}
                      staleNote="Khách đã sửa mặt lắp sau lần chạy này; đo thực tế để chốt số tấm."
                    />
                  </div>
                )}
              </div>

              {/* CỘT PHẢI (1/3) - THÔNG TIN KHÁCH HÀNG */}
              <div className="space-y-6">
                <div className="rounded-container border border-line bg-canvas p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <h2 className="text-title font-bold text-fg">Khách hàng</h2>
                    <span className="text-meta text-fg-3">{customerCode(job.surveyRequestId)}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ok text-body font-bold text-on-accent">
                      {getInitials(job.customer.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-body font-bold text-fg">{job.customer.fullName || 'Khách hàng'}</p>
                    </div>
                  </div>

                  {/* Khung số điện thoại */}
                  <div className="flex items-center justify-between rounded-control border border-ok/30 bg-ok-soft/20 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-meta font-semibold uppercase text-ok">
                        <Icon name="call" className="text-[16px]" />
                        <span>SỐ ĐIỆN THOẠI</span>
                      </div>
                      {customerPhone ? (
                        <a
                          href={`tel:${customerPhone}`}
                          className="tnum mt-1 block text-title font-bold text-fg hover:text-ok"
                        >
                          {customerPhone}
                        </a>
                      ) : (
                        <span className="mt-1 block text-body text-fg-3">Chưa có số điện thoại</span>
                      )}
                    </div>

                    {telHref && (
                      <a
                        href={telHref}
                        aria-label="Gọi khách hàng"
                        className="press flex size-9 shrink-0 items-center justify-center rounded-full bg-ok text-on-accent hover:opacity-90"
                      >
                        <Icon name="call" className="text-[16px]" />
                      </a>
                    )}
                  </div>

                  {/* Khung Hộp thư điện tử */}
                  <div className="rounded-control border border-line bg-surface-2 p-3">
                    <p className="text-meta font-semibold uppercase text-fg-3">HỘP THƯ ĐIỆN TỬ</p>
                    <p className="mt-1 truncate text-body font-medium text-fg">
                      {job.customer.email || 'Chưa cung cấp email'}
                    </p>
                  </div>

                  {job.onSiteContact && (
                    <div className="rounded-control border border-line bg-surface-2 p-3">
                      <p className="text-meta text-fg-3">Người gặp tại công trình</p>
                      <p className="mt-1 text-body font-medium text-fg">{job.onSiteContact.name || 'Chưa ghi tên'}</p>
                      {job.onSiteContact.phone && (
                        <a className="tnum ui-link text-body" href={`tel:${job.onSiteContact.phone}`}>
                          {job.onSiteContact.phone}
                        </a>
                      )}
                    </div>
                  )}

                  {job.customerNote && (
                    <div className="rounded-control border border-line bg-surface-2 p-3 space-y-1.5">
                      <p className="text-meta text-fg-3">Ghi chú của khách hàng</p>
                      <p className="text-body whitespace-pre-line text-fg-2">{job.customerNote}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }}
    </QueryBoundary>
  )
}
