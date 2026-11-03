import type { UseQueryResult } from '@tanstack/react-query'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink, IconButton } from '@/components/common/ui/button'
import { DateField } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import {
  addDays,
  appointmentStatusMeta,
  formatTimeRange,
  relativeDay,
  todayVn,
} from '@/features/scheduling/schedulingDisplay'
import { errorMessage, type ApiError } from '@/services/api/errors'
import type { ScheduleAppointmentView, TechnicianScheduleView } from '@/types/res/technicianAppointmentsRes'

// Lịch một ngày của kỹ thuật viên: các lịch và cảnh báo trùng giờ.
// Giữa hai lịch luôn chừa một khoảng nghỉ cố định (không tính đường đi)

// "Hôm nay" luôn có chỗ để cụm nút không nhảy khi đổi ngày
export function DayNav({
  date,
  onChange,
  label = 'Ngày',
}: {
  date: string
  onChange: (date: string) => void
  label?: string
}) {
  const today = todayVn()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton
        icon="chevron_left"
        label="Ngày trước"
        variant="secondary"
        onClick={() => onChange(addDays(date, -1))}
      />
      <DateField className="w-40" label={label} value={date} onChange={(value) => value && onChange(value)} />
      <IconButton
        icon="chevron_right"
        label="Ngày sau"
        variant="secondary"
        onClick={() => onChange(addDays(date, 1))}
      />
      <Button icon="today" disabled={date === today} onClick={() => onChange(today)}>
        Hôm nay
      </Button>
    </div>
  )
}

function AppointmentItem({
  item,
  linkTo,
  viewer,
}: {
  item: ScheduleAppointmentView
  linkTo?: string
  viewer: 'technician' | 'staff'
}) {
  const status = appointmentStatusMeta(item.status, viewer)
  return (
    <li className="grid gap-x-6 gap-y-3 rounded-container border border-line bg-canvas p-4 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-start">
      <p className="tnum text-title font-semibold text-fg">{formatTimeRange(item.startsAt, item.endsAt)}</p>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-body font-semibold text-fg">{item.propertyName}</h3>
          <Badge tone={status.tone}>{status.label}</Badge>
          {item.isCapacityHold && <Badge tone="neutral">Giữ chỗ tạm, chưa ai nhận</Badge>}
          {item.potentialConflict && (
            <Badge tone="danger" icon="warning">
              Sát giờ lịch trước
            </Badge>
          )}
        </div>
      </div>
      {linkTo && (
        <ButtonLink icon="visibility" to={linkTo} size="sm" variant="info" className="justify-self-start">
          Xem chi tiết
          <span className="sr-only"> {item.propertyName}</span>
        </ButtonLink>
      )}
    </li>
  )
}

export function ScheduleDay({
  date,
  query,
  linkFor,
  viewer,
  emptyText = 'Không có lịch khảo sát nào trong ngày này.',
}: {
  date: string
  query: UseQueryResult<TechnicianScheduleView, ApiError>
  linkFor?: (appointmentId: string) => string
  viewer: 'technician' | 'staff'
  emptyText?: string
}) {
  if (query.isPending)
    return (
      <div aria-label="Đang tải lịch" className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-24" />
      </div>
    )
  if (query.isError) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />

  const s = query.data
  return (
    <section aria-label={`Lịch ${relativeDay(date)}`} aria-busy={query.isFetching} className="space-y-6">
      {s.appointmentCount > 0 && (
        <StatRow framed>
          <Stat label="Lịch trong ngày" value={s.appointmentCount} />
          <Stat label="Nghỉ giữa hai lịch" value={s.bufferBetweenAppointmentsMinutes} unit="phút" />
        </StatRow>
      )}

      {s.conflictCount > 0 && (
        <Notice tone="danger" title={`${s.conflictCount} lịch có thể không kịp`}>
          Trùng giờ, hoặc không đủ {s.bufferBetweenAppointmentsMinutes} phút nghỉ giữa hai lịch. Đổi giờ hoặc chuyển bớt
          lịch cho người khác.
        </Notice>
      )}

      {s.appointments.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <ol className="space-y-3">
          {s.appointments.map((item) => (
            <AppointmentItem
              key={item.appointmentId}
              item={item}
              viewer={viewer}
              linkTo={linkFor?.(item.appointmentId)}
            />
          ))}
        </ol>
      )}
    </section>
  )
}
