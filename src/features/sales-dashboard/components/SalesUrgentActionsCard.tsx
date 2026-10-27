import { Link } from 'react-router'
import { Card } from '@/components/common/stitch-ui/Card'
import { Button } from '@/components/common/stitch-ui/Button'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { StatusBadge } from '@/components/common/stitch-ui/StatusBadge'
import { ROUTES, withId } from '@/routes/paths'
import type { EscalatedAppointmentView, PendingSurveyRequestItem } from '@/types/res/surveyRequestsRes'
import { formatRelative, isOverdue } from '@/features/pre-surveys/preSurveyDisplay'

type SalesUrgentActionsCardProps = {
  escalatedAppointments: EscalatedAppointmentView[]
  pendingRequests: PendingSurveyRequestItem[]
  onClaim?: (item: PendingSurveyRequestItem) => void
  isClaiming?: boolean
}

export function SalesUrgentActionsCard({
  escalatedAppointments,
  pendingRequests,
  onClaim,
  isClaiming,
}: SalesUrgentActionsCardProps) {
  const myEscalated = escalatedAppointments.filter((item) => item.ownedByMe)
  const overdueRequests = pendingRequests.filter((r) => isOverdue(r.submittedAt))
  const hasUrgent = myEscalated.length > 0 || overdueRequests.length > 0 || pendingRequests.length > 0

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between border-b border-surface-container-highest pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-error/10 text-error">
            <Icon name="notification_important" className="text-[20px]" />
          </div>
          <div>
            <h3 className="text-label-lg font-bold text-on-surface">Việc cần xử lý ngay</h3>
            <p className="text-body-sm text-on-surface-variant">Hồ sơ quá hạn hoặc cần gán kỹ thuật viên khẩn cấp</p>
          </div>
        </div>
        {hasUrgent && (
          <span className="rounded-full bg-error-container/60 px-2.5 py-0.5 text-label-sm font-semibold text-on-error-container">
            {myEscalated.length + overdueRequests.length} cảnh báo
          </span>
        )}
      </div>

      {!hasUrgent ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Icon name="check_circle" className="text-[28px]" />
          </div>
          <p className="mt-2 text-label-lg font-semibold text-on-surface">Mọi việc đều đang đúng tiến độ!</p>
          <p className="text-body-sm text-on-surface-variant">
            Không có hồ sơ nào bị quá hạn hoặc cần gán KTV khẩn cấp.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {myEscalated.map((item) => (
            <div
              key={item.surveyRequestId}
              className="flex flex-col gap-2 rounded-xl border border-error/30 bg-error-container/20 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-label-md font-bold text-on-surface">{item.customerName}</span>
                  <StatusBadge variant="error">Cần gán KTV</StatusBadge>
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  {item.propertyName} • {item.province}
                </p>
                <p className="text-body-xs font-medium text-error">Lịch hẹn chưa có KTV nhận trước thời hạn</p>
              </div>
              <Link to={withId(ROUTES.ops.survey, item.surveyRequestId)}>
                <Button size="sm" variant="primary">
                  Gán KTV ngay
                </Button>
              </Link>
            </div>
          ))}

          {pendingRequests.slice(0, 3).map((item) => (
            <div
              key={item.surveyRequestId}
              className="flex flex-col gap-2 rounded-xl border border-surface-container-highest bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-label-md font-bold text-on-surface">{item.customerName}</span>
                  {isOverdue(item.submittedAt) ? (
                    <StatusBadge variant="warning">Chờ {'>'}24h</StatusBadge>
                  ) : (
                    <StatusBadge variant="active">Mới gửi</StatusBadge>
                  )}
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  {item.propertyName} • {item.province}
                </p>
                <p className="text-body-xs text-on-surface-variant">Gửi lúc {formatRelative(item.submittedAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled={isClaiming} onClick={() => onClaim && onClaim(item)}>
                  Tiếp nhận hồ sơ
                </Button>
              </div>
            </div>
          ))}

          {pendingRequests.length > 3 && (
            <div className="pt-1 text-center">
              <Link to={ROUTES.ops.surveys} className="text-label-sm font-semibold text-primary hover:underline">
                Xem thêm {pendingRequests.length - 3} yêu cầu chờ tiếp nhận khác →
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
