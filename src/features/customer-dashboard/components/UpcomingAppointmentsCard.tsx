import { Icon } from '@/components/common/stitch-ui/Icon'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { APPOINTMENT_LABELS, APPOINTMENT_TONES } from '@/common/scheduling'
import { isUpcomingAppointment } from '@/features/customer-dashboard/services/dashboardChartService'
import { ROUTES, withId } from '@/routes/paths'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'

function formatDateTime(isoString: string) {
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

export function UpcomingAppointmentsCard({ requests }: { requests: CustomerSurveyRequestView[] }) {
  const activeAppointments = requests
    .filter((r) => isUpcomingAppointment(r))
    .sort((a, b) => a.appointment!.startsAt.localeCompare(b.appointment!.startsAt))

  return (
    <div className="rounded-container border border-line bg-surface-2 p-4 sm:p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Icon name="event" className="text-[18px] text-info" />
          <h2 className="text-body font-semibold text-fg sm:text-title">Lịch hẹn sắp tới</h2>
        </div>
        <ButtonLink
          to={ROUTES.customer.requests}
          size="sm"
          variant="ghost"
          icon="list"
          className="text-meta text-accent-fg hover:text-accent font-medium"
        >
          Tất cả
        </ButtonLink>
      </div>

      {activeAppointments.length === 0 ? (
        <div className="py-6 text-center text-body text-fg-2 space-y-2">
          <p className="text-meta">Chưa có lịch khảo sát hoặc bảo trì nào sắp tới.</p>
          <ButtonLink to={ROUTES.customer.requests} size="sm" variant="soft" icon="add">
            Đặt lịch khảo sát ngay
          </ButtonLink>
        </div>
      ) : (
        <ul className="relative space-y-3.5 before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-line">
          {activeAppointments.slice(0, 4).map((item) => {
            const appt = item.appointment!
            const tone = APPOINTMENT_TONES.customer[appt.status] || 'neutral'
            const label = APPOINTMENT_LABELS[appt.status] || appt.status

            return (
              <li key={item.surveyRequestId} className="relative flex items-start gap-3 pl-7">
                {/* Timeline Dot */}
                <span
                  aria-hidden
                  className="absolute left-1.5 top-1.5 size-3.5 rounded-full border-2 border-surface-2 bg-info shadow-sm"
                />

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <p className="font-semibold text-fg text-body truncate max-w-[170px]" title={item.propertyName}>
                      {item.propertyName}
                    </p>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                  <p className="text-meta font-medium text-info font-mono">{formatDateTime(appt.startsAt)}</p>
                  <p className="text-meta text-fg-2">KTV: {appt.assignedTechnicianName || 'Chờ phân công'}</p>
                </div>

                <ButtonLink
                  to={withId(ROUTES.customer.request, item.surveyRequestId)}
                  size="sm"
                  variant="ghost"
                  icon="chevron_right"
                  className="shrink-0 text-fg-2 hover:text-fg"
                >
                  <span className="sr-only">Chi tiết</span>
                </ButtonLink>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
