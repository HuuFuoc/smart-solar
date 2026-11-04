import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { ListRow } from '@/components/common/ui/list-row'
import { Panel, PanelHeader } from '@/components/common/ui/panel'
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
    <Panel>
      <PanelHeader
        className="items-start"
        title="Lịch khảo sát"
        description={activeAppointments.length > 0 ? `${activeAppointments.length} lịch sắp tới` : undefined}
        action={
          <ButtonLink to={ROUTES.customer.requests} size="sm" variant="info" icon="list">
            Tất cả yêu cầu khảo sát
          </ButtonLink>
        }
      />
      {activeAppointments.length === 0 ? (
        <p className="text-body text-fg-2">Chưa có lịch khảo sát sắp tới.</p>
      ) : (
        <ul className="divide-y divide-line">
          {activeAppointments.slice(0, 5).map((item) => {
            const appt = item.appointment!
            const tone = APPOINTMENT_TONES.customer[appt.status] || 'neutral'
            const label = APPOINTMENT_LABELS[appt.status] || appt.status

            return (
              <ListRow
                key={item.surveyRequestId}
                className="flex items-center justify-between gap-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-fg-1">{item.propertyName}</p>
                  <p className="text-meta text-fg-2">
                    {formatDateTime(appt.startsAt)}
                    {appt.assignedTechnicianName && `, kỹ thuật viên ${appt.assignedTechnicianName}`}
                  </p>
                  <Badge tone={tone}>{label}</Badge>
                </div>
                <ButtonLink
                  to={withId(ROUTES.customer.request, item.surveyRequestId)}
                  size="sm"
                  variant="info"
                  icon="visibility"
                  className="shrink-0"
                >
                  Xem
                </ButtonLink>
              </ListRow>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
