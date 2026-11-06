import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
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
  const warnings = myEscalated.length + overdueRequests.length

  return (
    <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-title font-semibold text-fg">Việc cần xử lý ngay</h2>
        {warnings > 0 ? <Badge tone="danger">{warnings} cảnh báo</Badge> : <Badge tone="neutral">0 cảnh báo</Badge>}
      </div>

      {!hasUrgent ? (
        <p className="py-2.5 text-center text-body text-fg-2">Không có việc cần xử lý ngay</p>
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-line">
            {myEscalated.map((item) => (
              <li key={item.surveyRequestId} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-fg">{item.customerName || 'Khách hàng'}</span>
                  <Badge tone="danger">Cần phân công</Badge>
                </div>
                <p className="text-meta text-fg-2">
                  {item.propertyName}, {item.province}
                </p>
                <p className="text-meta text-danger">Lịch quá hạn mà không kỹ thuật viên nào nhận</p>
                <div className="pt-1">
                  <ButtonLink
                    to={withId(ROUTES.ops.survey, item.surveyRequestId)}
                    size="sm"
                    variant="soft"
                    icon="assignment_ind"
                  >
                    Phân công kỹ thuật viên
                  </ButtonLink>
                </div>
              </li>
            ))}
            {pendingRequests.slice(0, 3).map((item) => (
              <li key={item.surveyRequestId} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-fg">{item.customerName || 'Khách hàng'}</span>
                  {isOverdue(item.submittedAt) ? (
                    <Badge tone="warn">Chờ hơn 1 ngày</Badge>
                  ) : (
                    <Badge tone="info">Mới gửi</Badge>
                  )}
                </div>
                <p className="text-meta text-fg-2">
                  {[item.propertyName, item.province].filter(Boolean).join(', ')}, gửi{' '}
                  {formatRelative(item.submittedAt)}
                </p>
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="soft"
                    icon="add_task"
                    disabled={isClaiming}
                    onClick={() => onClaim?.(item)}
                  >
                    Tiếp nhận hồ sơ
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {pendingRequests.length > 3 && (
            <div className="border-t border-line pt-2 text-center">
              <ButtonLink
                to={ROUTES.ops.surveys}
                size="sm"
                variant="ghost"
                icon="list"
                className="text-meta font-medium text-accent-fg hover:underline"
              >
                Xem thêm {pendingRequests.length - 3} yêu cầu chờ tiếp nhận
              </ButtonLink>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
