import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Badge } from '@/components/common/ui/badge'
import { Button, IconButton } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/field'
import { Notice } from '@/components/common/ui/lists'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/ui/states'
import { TravelSummary } from '@/features/scheduling/TravelSummary'
import {
  addDays,
  appointmentStatusMeta,
  formatDistance,
  formatDuration,
  formatMoment,
  formatTime,
  formatTimeRange,
  recalculationReasonLabel,
  relativeDay,
  scheduleRoutingMeta,
  todayVn,
} from '@/features/scheduling/schedulingDisplay'
import { errorMessage, type ApiError } from '@/services/api/errors'
import type { ScheduleAppointmentView, TechnicianScheduleView } from '@/types/res/technicianAppointmentsRes'

/*
  Lịch một ngày của một kỹ thuật viên: các lịch theo giờ, chặng đường tới từng lịch (ước tính đã lưu, không gọi lại Vietmap),
  tổng quãng đường / thời gian đi, cảnh báo trùng giờ. Chỉ chặng "OK" là số liệu hiện tại; chặng đang tính lại, cũ, lỗi
  hoặc chưa có thì ghi rõ trạng thái và không hiện số cũ như đang đúng (tổng của backend cũng chỉ cộng chặng OK).
  Dùng cho kỹ thuật viên (lịch của mình) và quản trị / quản lý (lịch của một kỹ thuật viên).
*/

export function DayNav({ date, onChange, label = 'Ngày' }: { date: string; onChange: (date: string) => void; label?: string }) {
  const today = todayVn()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <IconButton icon="chevron_left" label="Ngày trước" variant="secondary" onClick={() => onChange(addDays(date, -1))} />
      <label className="w-44">
        <span className="sr-only">{label}</span>
        <Input type="date" value={date} onChange={(e) => e.target.value && onChange(e.target.value)} />
      </label>
      <IconButton icon="chevron_right" label="Ngày sau" variant="secondary" onClick={() => onChange(addDays(date, 1))} />
      {date !== today && (
        <Button variant="ghost" bleed={false} onClick={() => onChange(today)}>
          Hôm nay
        </Button>
      )}
    </div>
  )
}

function Leg({ item }: { item: ScheduleAppointmentView }) {
  const routing = scheduleRoutingMeta(item.routingStatus)
  if (item.routingStatus === 'OK' && item.inboundTravel) return <TravelSummary leg={item.inboundTravel} />
  return (
    <div className="space-y-1">
      <Badge tone={routing.tone}>{routing.label}</Badge>
      {item.nonCurrentEstimate && (
        <p className="text-meta text-fg-3">
          Ước tính trước đó (lúc {formatMoment(item.nonCurrentEstimate.estimatedAt)}) không còn đúng nên không dùng.
        </p>
      )}
    </div>
  )
}

function AppointmentItem({ item, linkTo, viewer }: { item: ScheduleAppointmentView; linkTo?: string; viewer: 'technician' | 'staff' }) {
  const status = appointmentStatusMeta(item.status, viewer)
  return (
    <li className="grid gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <p className="tnum text-title font-semibold text-fg">{formatTimeRange(item.startsAt, item.endsAt)}</p>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-body font-semibold text-fg">
            {linkTo ? (
              <Link to={linkTo} className="ui-link">
                {item.propertyName}
              </Link>
            ) : (
              item.propertyName
            )}
          </h3>
          <Badge tone={status.tone}>{status.label}</Badge>
          {item.potentialConflict && (
            <Badge tone="danger" icon="warning">
              Có thể không kịp
            </Badge>
          )}
        </div>
        <Leg item={item} />
      </div>
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
  const r = s.recalculation
  return (
    <section aria-label={`Lịch ${relativeDay(date)}`} aria-busy={query.isFetching} className="space-y-6">
      {s.appointmentCount > 0 && (
        <StatRow>
          <Stat label="Lịch trong ngày" value={s.appointmentCount} />
          <Stat label="Quãng đường đã kiểm tra" value={formatDistance(s.estimatedTravelDistanceMeters)} />
          <Stat label="Thời gian đi" value={formatDuration(s.estimatedTravelSeconds)} note={`cộng ${s.safetyBufferMinutesTotal} phút dự phòng`} />
          <Stat label="Rời nơi xuất phát từ" value={formatTime(s.earliestBaseDeparture)} />
        </StatRow>
      )}

      {r && (
        <Notice tone={r.status === 'FAILED' ? 'warn' : 'info'} title={r.status === 'FAILED' ? 'Chưa tính lại được đường đi' : 'Đang tính lại đường đi'}>
          Lịch trong ngày vừa thay đổi ({recalculationReasonLabel(r.reason)}). Hệ thống thử lại lúc {formatTime(r.nextAttemptAt)}
          {r.attempts > 0 ? `, đã thử ${r.attempts} lần` : ''}. Trang tự tải lại khi xong.
        </Notice>
      )}
      {s.conflictCount > 0 && (
        <Notice tone="danger" title={`${s.conflictCount} lịch có thể không kịp`}>
          Trùng giờ, hoặc không đủ thời gian đi và dự phòng giữa hai lịch. Đổi giờ hoặc chuyển bớt lịch cho người khác.
        </Notice>
      )}
      {s.routesNeedingReview > 0 && !r && (
        <Notice tone="warn">
          {s.routesNeedingReview} chặng đường chưa được kiểm tra lại; tổng quãng đường và thời gian đi chỉ tính các chặng đã kiểm tra.
        </Notice>
      )}

      {s.appointments.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <ol className="divide-y divide-line">
          {s.appointments.map((item) => (
            <AppointmentItem key={item.appointmentId} item={item} viewer={viewer} linkTo={linkFor?.(item.appointmentId)} />
          ))}
        </ol>
      )}
      <p className="text-meta text-fg-3">
        Thời gian đi là ước tính xe máy của Vietmap lưu lại khi lịch thay đổi, không phải giao thông trực tiếp. Mỗi chặng cộng thêm phút dự phòng.
      </p>
    </section>
  )
}
