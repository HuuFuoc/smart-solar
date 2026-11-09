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
}

export function CustomerRequestCard({ request: r, dispatch: d }: CustomerRequestCardProps) {
  const progress = customerRequestProgress(r, d)
  const a = r.appointment
  const live = d?.status === 'PROPOSAL_PENDING' ? d.liveProposal : null
  const isTodo = customerRequestTodo(r, d)

  return (
    <article className="rounded-xl border border-line bg-surface-1 p-4 shadow-2xs transition-all hover:border-line-2 hover:shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-title font-semibold text-fg">
              {r.propertyName || 'Công trình chưa đặt tên'}
            </h3>
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-micro font-medium text-fg-2">
              #{shortCode(r.surveyRequestId)}
            </span>
          </div>
          <p className="mt-1 text-meta text-fg-3">
            Đã gửi {formatRelative(r.submittedAt)}
          </p>

          {/* Khối hiển thị lịch hẹn khi đã có lịch */}
          {a && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-sm text-fg">
              <div className="flex items-center gap-1.5">
                <Icon name="event" className="text-accent text-[18px]" />
                <span className="font-medium text-fg-2">Lịch hẹn:</span>
                <span className="font-semibold text-fg">{formatAppointment(a.startsAt, a.endsAt)}</span>
              </div>
              {a.assignedTechnicianName && (
                <div className="flex items-center gap-1.5">
                  <Icon name="person" className="text-fg-3 text-[18px]" />
                  <span className="font-medium text-fg-2">Kỹ thuật viên:</span>
                  <span className="font-semibold text-fg">{a.assignedTechnicianName}</span>
                </div>
              )}
            </div>
          )}

          {/* Khối thông báo đề xuất giờ từ điều phối viên */}
          {live && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-fg">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <Icon name="notification_important" className="text-[18px]" />
                <span className="font-medium">Đề xuất giờ:</span>
                <span className="font-semibold">{formatAppointment(live.startsAt, live.endsAt)}</span>
              </div>
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Xác nhận trước {formatMoment(live.expiresAt)}
              </span>
            </div>
          )}

          {/* Gợi ý khi chưa đặt lịch */}
          {isTodo && !live && (
            <p className="mt-2.5 flex items-center gap-1.5 text-meta font-medium text-amber-700 dark:text-amber-400">
              <Icon name="info" className="text-[16px] shrink-0" />
              <span>Vui lòng chọn khung giờ để kỹ thuật viên SmartSolar đến tận nơi đo đạc và tư vấn.</span>
            </p>
          )}
        </div>

        {/* Khối trạng thái & nút hành động */}
        <div className="flex flex-row items-center justify-between gap-3 border-t border-line/60 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
          <RequestStatusBadge label={progress.label} tone={progress.tone} />
          <ButtonLink
            icon={isTodo ? 'calendar_month' : 'visibility'}
            to={withId(ROUTES.customer.request, r.surveyRequestId)}
            size="sm"
            variant={isTodo ? 'primary' : 'secondary'}
            className="shrink-0"
            aria-label={`${isTodo ? 'Đặt lịch' : 'Xem'} cho công trình ${r.propertyName || 'chưa đặt tên'}`}
          >
            {live ? 'Xem giờ đề xuất' : isTodo ? 'Đặt giờ khảo sát' : 'Xem yêu cầu'}
          </ButtonLink>
        </div>
      </div>
    </article>
  )
}

