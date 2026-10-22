import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/common/ui/panel'
import { APPOINTMENT_LABELS, APPOINTMENT_TONES } from '@/common/scheduling'
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

export function UpcomingAppointmentsCard({
  requests,
}: {
  requests: CustomerSurveyRequestView[]
}) {
  const activeAppointments = requests.filter(
    (r) =>
      r.appointment &&
      r.appointment.status !== 'CANCELLED' &&
      r.appointment.status !== 'COMPLETED',
  )

  const hasScroll = activeAppointments.length > 2

  return (
    <Panel className="flex flex-col justify-between">
      <div>
        <PanelHeader
          title="Lịch khảo sát thực địa"
          description={
            activeAppointments.length > 0
              ? `${activeAppointments.length} lịch hẹn đang chờ thực hiện`
              : 'Chưa có lịch hẹn khảo sát'
          }
        />
        <PanelBody>
          {activeAppointments.length === 0 ? (
            <div className="py-6 text-center text-body text-fg-3">
              <p>Bạn chưa có lịch hẹn khảo sát thực địa nào.</p>
              <p className="mt-1 text-meta">
                Sau khi gửi khảo sát sơ bộ, bạn có thể tự chọn giờ hẹn với chuyên viên.
              </p>
            </div>
          ) : (
            <div className={hasScroll ? 'max-h-[260px] overflow-y-auto pr-1.5' : undefined}>
              <ul className="divide-y divide-line">
                {activeAppointments.map((item) => {
                  const appt = item.appointment!
                  const tone = APPOINTMENT_TONES.customer[appt.status] || 'neutral'
                  const label = APPOINTMENT_LABELS[appt.status] || appt.status

                  return (
                    <li key={item.surveyRequestId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-fg-1">{item.propertyName}</p>
                          <p className="text-meta text-fg-3">{formatDateTime(appt.startsAt)}</p>
                        </div>
                        <Badge tone={tone}>{label}</Badge>
                      </div>
                      {appt.assignedTechnicianName && (
                        <p className="text-meta text-fg-2">
                          Kỹ thuật viên: <span className="font-medium text-fg-1">{appt.assignedTechnicianName}</span>
                        </p>
                      )}
                      <div className="pt-1">
                        <ButtonLink to={withId(ROUTES.customer.request, item.surveyRequestId)} size="sm">
                          Chi tiết lịch hẹn
                        </ButtonLink>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </PanelBody>
      </div>

      <PanelFooter className="flex justify-end">
        <ButtonLink to={ROUTES.customer.requests} size="sm">
          Tất cả yêu cầu khảo sát
        </ButtonLink>
      </PanelFooter>
    </Panel>
  )
}