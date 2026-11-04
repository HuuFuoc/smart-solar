import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
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
    <Panel>
      <PanelHeader
        title="Việc cần xử lý ngay"
        action={warnings > 0 ? <Badge tone="danger">{warnings} cảnh báo</Badge> : undefined}
      />
      {!hasUrgent ? (
        <p className="text-body text-fg-2">Không có việc cần xử lý ngay</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {myEscalated.map((item) => (
              <ListRow key={item.surveyRequestId} className="space-y-1 first:pt-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-body font-semibold text-fg">{item.customerName}</span>
                  <Badge tone="danger">Cần gán KTV</Badge>
                </div>
                <p className="text-meta text-fg-2">
                  {item.propertyName}, {item.province}
                </p>
                <p className="text-meta text-danger">Lịch hẹn chưa có KTV nhận trước thời hạn</p>
                <ButtonLink to={withId(ROUTES.ops.survey, item.surveyRequestId)} size="sm" variant="primary">
                  Gán KTV ngay
                </ButtonLink>
              </ListRow>
            ))}
            {pendingRequests.slice(0, 3).map((item) => (
              <ListRow key={item.surveyRequestId} className="space-y-1 first:pt-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-body font-semibold text-fg">{item.customerName}</span>
                  {isOverdue(item.submittedAt) ? <Badge tone="warn">Chờ hơn 24 giờ</Badge> : <Badge>Mới gửi</Badge>}
                </div>
                <p className="text-meta text-fg-2">
                  {item.propertyName}, {item.province}, gửi {formatRelative(item.submittedAt)}
                </p>
                <Button size="sm" variant="soft" disabled={isClaiming} onClick={() => onClaim?.(item)}>
                  Tiếp nhận hồ sơ
                </Button>
              </ListRow>
            ))}
          </ul>
          {pendingRequests.length > 3 && (
            <ButtonLink to={ROUTES.ops.surveys} size="sm" variant="info" className="mt-2">
              Xem thêm {pendingRequests.length - 3} yêu cầu chờ tiếp nhận
            </ButtonLink>
          )}
        </>
      )}
    </Panel>
  )
}
