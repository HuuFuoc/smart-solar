import { Icon } from '@/components/common/stitch-ui/Icon'
import { Avatar } from '@/components/common/ui/avatar'
import { Button } from '@/components/common/ui/button'
import { formatDateTime } from '@/features/pre-surveys/preSurveyDisplay'
import { formatDay, formatTimeRange, vnDate } from '@/features/scheduling/schedulingDisplay'
import type { CustomerSurveyRequestView } from '@/types/res/customerSurveyRequestsRes'

type AppointmentCardProps = {
  request: CustomerSurveyRequestView
  onReschedule: () => void
  onCancel: () => void
}

/** Thẻ Lịch khảo sát nổi bật đầu cột nội dung: hiển thị giờ hẹn, KTV và lưu ý đổi/huỷ ngay trong thẻ. */
export function AppointmentCard({ request, onReschedule, onCancel }: AppointmentCardProps) {
  const a = request.appointment
  if (!a) return null

  const note = a.customerNote?.trim()
  const dayLabel = formatDay(vnDate(a.startsAt), { year: true })
  const timeLabel = formatTimeRange(a.startsAt, a.endsAt)
  const isCompleted = request.status === 'COMPLETED' || a.acceptanceStatus === 'COMPLETED'

  return (
    <section
      aria-labelledby="appointment-card-heading"
      className="rounded-container border border-accent-line/40 bg-accent-soft/75 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-accent-fg">
          <Icon name="calendar_month" className="text-[20px]" aria-hidden />
          <h2 id="appointment-card-heading" className="text-body font-semibold">
            Lịch khảo sát
          </h2>
        </div>

        {a.canCustomerChange && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" icon="edit_calendar" onClick={onReschedule}>
              Đổi giờ
            </Button>
            <Button size="sm" variant="danger" icon="event_busy" onClick={onCancel}>
              Huỷ lịch
            </Button>
          </div>
        )}
      </div>

      <p className="tnum mt-3 text-title font-semibold text-fg sm:text-figure">
        {dayLabel} · {timeLabel}
      </p>

      <div className="mt-4 space-y-2.5">
        <div className="flex items-center gap-3">
          {a.assignedTechnicianName ? (
            <Avatar name={a.assignedTechnicianName} size="sm" tone="accent" />
          ) : (
            <span
              aria-hidden
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-accent-line/35 bg-canvas/80 text-fg-2"
            >
              <Icon name="person_search" className="text-[16px]" />
            </span>
          )}
          <p className="min-w-0 text-body text-fg-2">
            Kỹ thuật viên:{' '}
            <span className="font-medium text-fg">{a.assignedTechnicianName || 'Đang chờ kỹ thuật viên nhận'}</span>
          </p>
        </div>

        {note && (
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-canvas/70 text-fg-2"
            >
              <Icon name="notes" className="text-[16px]" />
            </span>
            <p className="min-w-0 text-body text-fg-2">
              Ghi chú: <span className="text-fg">{note}</span>
            </p>
          </div>
        )}

        <p className="tnum flex items-center gap-1.5 pl-10 text-meta text-fg-2">
          <Icon name="schedule" className="text-[15px]" aria-hidden />
          <span>Đặt lúc {formatDateTime(a.bookedAt)}</span>
        </p>
      </div>

      {!a.canCustomerChange && !isCompleted && (
        <p className="mt-4 flex items-start gap-2 border-t border-accent-line/30 pt-3 text-meta text-fg-2">
          <Icon name="info" className="mt-0.5 shrink-0 text-[16px] text-accent-fg" aria-hidden />
          <span>Lịch đã sát giờ hẹn nên bạn không tự đổi hoặc huỷ được. Cần đổi, hãy liên hệ bộ phận kinh doanh.</span>
        </p>
      )}
    </section>
  )
}
