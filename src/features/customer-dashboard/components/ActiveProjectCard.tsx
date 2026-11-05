import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import {
  CUSTOMER_INSTALLATION_LABELS,
  INSTALLATION_STATUS_LABELS,
  INSTALLATION_STATUS_TONES,
} from '@/common/installation'
import { ROUTES, withId } from '@/routes/paths'
import type { InstallationCustomerView } from '@/types/res/customerInstallationsRes'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import { surveyStatusMeta } from '@/features/pre-surveys/preSurveyDisplay'

function formatScheduleTime(isoString: string | null) {
  if (!isoString) return 'Chưa ấn định thời gian'
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(isoString))
  } catch {
    return isoString
  }
}

function getProgressPercent(status: string): number {
  switch (status) {
    case 'PENDING_ASSIGNMENT':
      return 15
    case 'PENDING_TECHNICIAN_ACCEPTANCE':
      return 25
    case 'SCHEDULED':
      return 40
    case 'IN_PROGRESS':
      return 65
    case 'PENDING_CUSTOMER_ACCEPTANCE':
      return 90
    case 'REWORK_REQUIRED':
      return 75
    case 'COMPLETED':
      return 100
    case 'CANCELLED':
      return 0
    default:
      return 10
  }
}

type ActiveProjectCardProps = {
  installations: InstallationCustomerView[]
  surveyRequests?: CustomerSurveyRequestView[]
}

export function ActiveProjectCard({ installations, surveyRequests = [] }: ActiveProjectCardProps) {
  const activeProject =
    installations.find((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED') || installations[0]

  // Trường hợp khách chưa có dự án thi công nhưng đã gửi yêu cầu khảo sát
  const pendingSurvey =
    !activeProject && surveyRequests.length > 0
      ? surveyRequests.find((r) => r.status !== 'CANCELLED' && r.status !== 'CLOSED') || surveyRequests[0]
      : null

  return (
    <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Icon name="domain" className="text-[20px] text-accent" />
          <h2 className="text-body font-semibold text-fg sm:text-title">Công trình & Hồ sơ lắp đặt</h2>
          <span className="text-meta font-mono text-fg-3">
            ({installations.length > 0 ? `${installations.length} công trình` : `${surveyRequests.length} hồ sơ`})
          </span>
        </div>

        <ButtonLink
          to={installations.length > 0 ? ROUTES.customer.projects : ROUTES.customer.requests}
          size="sm"
          variant="ghost"
          icon="list"
          className="text-meta font-medium text-accent-fg hover:text-accent"
        >
          {installations.length > 0 ? 'Xem tất cả công trình' : 'Xem tất cả yêu cầu'}
        </ButtonLink>
      </div>

      {/* TH 1: Có dự án lắp đặt */}
      {activeProject ? (
        <div className="space-y-4">
          {/* Card thông tin dự án đang chạy */}
          {(() => {
            const statusLabel =
              CUSTOMER_INSTALLATION_LABELS[activeProject.status] ||
              INSTALLATION_STATUS_LABELS[activeProject.status] ||
              activeProject.status
            const statusTone = INSTALLATION_STATUS_TONES.customer[activeProject.status] || 'neutral'
            const isAwaitingAcceptance = activeProject.status === 'PENDING_CUSTOMER_ACCEPTANCE'
            const progress = getProgressPercent(activeProject.status)

            return (
              <div className="rounded-control border border-line bg-canvas/60 p-4 space-y-3.5">
                {/* Dòng 1: Mã hồ sơ + Badge trạng thái */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-fg">
                        Dự án #{activeProject.projectId.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-meta text-fg-3">
                        (HĐ #{activeProject.contractId.slice(0, 8).toUpperCase()})
                      </span>
                    </div>
                    <p className="mt-0.5 text-meta text-fg-2">
                      Kỹ thuật viên phụ trách: {activeProject.technicianName || 'Đang điều phối nhân sự'}
                    </p>
                  </div>
                  <Badge tone={statusTone}>{statusLabel}</Badge>
                </div>

                {/* Banner cảnh báo nếu chờ nghiệm thu */}
                {isAwaitingAcceptance && (
                  <div className="flex items-center gap-2 rounded-control bg-danger-soft p-2.5 text-danger border border-danger/30">
                    <Icon name="notification_important" className="text-[18px] shrink-0" />
                    <p className="text-meta font-semibold">
                      Công trình đã thi công hoàn tất. Vui lòng kiểm tra và nghiệm thu để kích hoạt bàn giao!
                    </p>
                  </div>
                )}

                {/* Tiến độ thi công (Progress Bar) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-meta">
                    <span className="text-fg-2">Tiến độ thi công</span>
                    <span className="font-semibold font-mono text-accent-fg">{progress}% hoàn thành</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-control bg-surface-3">
                    <div
                      className="h-full rounded-control bg-accent transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Thông số kỹ thuật nhanh */}
                <div className="grid grid-cols-2 gap-3 pt-1 text-meta sm:grid-cols-3">
                  <div className="rounded-control bg-surface-2 p-2">
                    <p className="text-fg-3">Lịch thi công</p>
                    <p className="font-medium text-fg truncate" title={formatScheduleTime(activeProject.scheduledStartsAt)}>
                      {formatScheduleTime(activeProject.scheduledStartsAt)}
                    </p>
                  </div>
                  <div className="rounded-control bg-surface-2 p-2">
                    <p className="text-fg-3">Thiết bị ghi nhận</p>
                    <p className="font-medium text-fg">{activeProject.assets.length} thiết bị chính</p>
                  </div>
                  <div className="rounded-control bg-surface-2 p-2 col-span-2 sm:col-span-1">
                    <p className="text-fg-3">Minh chứng thi công</p>
                    <p className="font-medium text-fg">{activeProject.evidence.length} hình ảnh thực tế</p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
                  <ButtonLink
                    to={ROUTES.customer.quotations}
                    size="sm"
                    variant="ghost"
                    icon="request_quote"
                    className="text-meta text-fg-2 hover:text-fg"
                  >
                    Xem báo giá & hợp đồng
                  </ButtonLink>

                  <ButtonLink
                    to={withId(ROUTES.customer.project, activeProject.projectId)}
                    size="sm"
                    variant={isAwaitingAcceptance ? 'primary' : 'soft'}
                    icon={isAwaitingAcceptance ? 'task_alt' : 'arrow_forward'}
                  >
                    {isAwaitingAcceptance ? 'Nghiệm thu công trình ngay' : 'Theo dõi tiến độ chi tiết'}
                  </ButtonLink>
                </div>
              </div>
            )
          })()}
        </div>
      ) : pendingSurvey ? (
        /* TH 2: Chưa có dự án thi công nhưng đang có yêu cầu khảo sát */
        <div className="rounded-control border border-line bg-canvas/60 p-4 space-y-3">
          {(() => {
            const meta = surveyStatusMeta(pendingSurvey.status)
            return (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-fg">{pendingSurvey.propertyName || 'Công trình khảo sát'}</h3>
                    <p className="mt-0.5 text-meta text-fg-2">
                      Mã hồ sơ: #{pendingSurvey.surveyRequestId.slice(0, 8).toUpperCase()} • Gửi lúc{' '}
                      {formatScheduleTime(pendingSurvey.submittedAt)}
                    </p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>

                <p className="text-meta text-fg-2">
                  {pendingSurvey.appointment
                    ? `Lịch hẹn đo đạc thực tế đã đặt: ${formatScheduleTime(pendingSurvey.appointment.startsAt)}`
                    : 'Hồ sơ đang chờ xếp lịch kỹ thuật viên đến đo đạc thực tế.'}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
                  <ButtonLink
                    to={ROUTES.customer.quotations}
                    size="sm"
                    variant="ghost"
                    icon="request_quote"
                    className="text-meta text-fg-2"
                  >
                    Kiểm tra báo giá
                  </ButtonLink>
                  <ButtonLink
                    to={withId(ROUTES.customer.request, pendingSurvey.surveyRequestId)}
                    size="sm"
                    variant="soft"
                    icon="visibility"
                  >
                    Chi tiết yêu cầu khảo sát
                  </ButtonLink>
                </div>
              </>
            )
          })()}
        </div>
      ) : (
        /* TH 3: Trống */
        <div className="py-8 text-center text-body text-fg-2 space-y-3">
          <p>Chưa có công trình lắp đặt nào đang triển khai.</p>
          <ButtonLink to={ROUTES.customer.assessment} size="sm" variant="primary" icon="roofing">
            Bắt đầu ước tính công suất mái
          </ButtonLink>
        </div>
      )}
    </div>
  )
}
