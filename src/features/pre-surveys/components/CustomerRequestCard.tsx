import { Icon } from '@/components/common/stitch-ui/Icon'
import { ButtonLink } from '@/components/common/ui/button'
import { RequestStatusBadge } from '@/features/pre-surveys/components/RequestStatusBadge'
import { customerRequestProgress, customerRequestTodo } from '@/features/dispatch/dispatchDisplay'
import { formatRelative, shortCode } from '@/features/pre-surveys/preSurveyDisplay'
import { formatAppointment, formatMoment } from '@/features/scheduling/schedulingDisplay'
import { ROUTES, withId } from '@/routes/paths'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'
import type { CustomerDispatchView } from '@/types/res/dispatchRes'

export interface CustomerRequestCardProps {
  request: CustomerSurveyRequestView
  dispatch?: CustomerDispatchView
  showStatusBadge?: boolean
}

export function CustomerRequestCard({
  request: r,
  dispatch: d,
  showStatusBadge = false,
}: CustomerRequestCardProps) {
  const progress = customerRequestProgress(r, d)
  const a = r.appointment
  const live = d?.status === 'PROPOSAL_PENDING' ? d.liveProposal : null
  const isTodo = customerRequestTodo(r, d)

  return (
    <article className="rounded-lg border border-line/60 bg-surface-1 px-4 py-3 shadow-2xs transition-colors hover:bg-surface-2/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Bên trái: Tên đậm + dòng phụ xám nhỏ + lịch hẹn inline (nếu có) */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-fg">
              {r.propertyName || 'Công trình chưa đặt tên'}
            </h3>
            {showStatusBadge && <RequestStatusBadge label={progress.label} tone={progress.tone} />}
          </div>

          <p className="mt-0.5 text-xs text-fg-3">
            #{shortCode(r.surveyRequestId)} · Gửi {formatRelative(r.submittedAt)}
          </p>

          {/* Dòng lịch hẹn inline gọn gàng cho mục Đã có lịch */}
          {a && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-fg-2">
              <Icon name="calendar_today" className="text-[14px] text-accent" />
              <span className="font-medium text-fg">{formatAppointment(a.startsAt, a.endsAt)}</span>
              {a.assignedTechnicianName && (
                <span className="text-fg-3">
                  · KTV: <strong className="font-medium text-fg">{a.assignedTechnicianName}</strong>
                </span>
              )}
            </div>
          )}

          {/* Đề xuất giờ từ điều phối (nếu có) */}
          {live && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <Icon name="notification_important" className="text-[14px]" />
              <span>
                Đề xuất: <strong>{formatAppointment(live.startsAt, live.endsAt)}</strong> (trả lời trước {formatMoment(live.expiresAt)})
              </span>
            </div>
          )}
        </div>

        {/* Bên phải: Đúng 1 nút hành động duy nhất */}
        <div className="shrink-0 pt-2 sm:pt-0">
          <ButtonLink
            icon={isTodo ? 'calendar_month' : undefined}
            to={withId(ROUTES.customer.request, r.surveyRequestId)}
            size="sm"
            variant={isTodo ? 'primary' : 'secondary'}
            className="h-9 w-full rounded-lg px-3.5 text-sm font-medium sm:w-auto"
            aria-label={`${isTodo ? 'Đặt lịch' : 'Xem'} cho ${r.propertyName || 'công trình'}`}
          >
            {live ? 'Xem giờ đề xuất' : isTodo ? 'Đặt giờ khảo sát' : 'Xem yêu cầu'}
          </ButtonLink>
        </div>
      </div>
    </article>
  )
}
