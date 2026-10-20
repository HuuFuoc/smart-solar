import { useState } from 'react'
import { Badge } from '@/components/common/ui/badge'
import { ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import {
  appointmentStatusMeta,
  formatDay,
  formatTimeRange,
  relativeDay,
  todayVn,
  vnDate,
} from '@/features/scheduling/components/schedulingDisplay'
import { useMyAppointmentsQuery } from '@/hooks/useTechnicianJobs'
import { ROUTES, withId } from '@/routes/paths'
import type { TechnicianAppointmentListItem } from '@/types/res/technicianAppointmentsRes'

type Tab = 'upcoming' | 'past'

/** Lịch chưa kết thúc là "sắp tới" (kể cả đang diễn ra). */
const isUpcoming = (a: TechnicianAppointmentListItem, now: number) => new Date(a.endsAt).getTime() >= now

/* Nhóm theo ngày (giờ Việt Nam), giữ thứ tự đã sắp. */
function byDay(rows: TechnicianAppointmentListItem[]) {
  const groups = new Map<string, TechnicianAppointmentListItem[]>()
  for (const r of rows) {
    const day = vnDate(r.startsAt)
    groups.set(day, [...(groups.get(day) ?? []), r])
  }
  return [...groups]
}

/*
  Lịch khảo sát kinh doanh đã phân công cho kỹ thuật viên (GET /api/technicians/me/appointments), nhóm theo ngày. Lịch còn
  chờ xác nhận ("Chờ bạn nhận việc") là việc của người xem: số đỏ ở menu, nhãn đỏ trên dòng; số trên tab để xám (một sự
  việc chỉ báo đỏ một lần). Nhận việc ở trang chi tiết, sau khi đã xem địa chỉ và số liệu.
*/
export function TechJobsPage() {
  const query = useMyAppointmentsQuery()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [now] = useState(() => Date.now())
  const today = todayVn()
  const rows = query.data ?? []
  const upcoming = rows.filter((r) => isUpcoming(r, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = rows.filter((r) => !isUpcoming(r, now)).sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  const waiting = upcoming.filter((r) => r.status === 'ASSIGNED').length
  const shown = tab === 'upcoming' ? upcoming : past

  return (
    <>
      <PageHeader
        title="Việc của tôi"
        description={
          waiting > 0 ? (
            <Badge tone="danger" icon="assignment_late">
              {waiting} lịch chờ bạn nhận việc
            </Badge>
          ) : undefined
        }
        actions={
          <ButtonLink to={ROUTES.tech.schedule} icon="calendar_month">
            Lịch làm việc
          </ButtonLink>
        }
      />
      <FilterChips
        label="Lọc lịch"
        className="mb-6"
        value={tab}
        onChange={setTab}
        chips={[
          { value: 'upcoming', label: 'Sắp tới', count: upcoming.length },
          { value: 'past', label: 'Đã qua', count: past.length },
        ]}
      />
      <QueryBoundary query={query}>
        {() =>
          shown.length === 0 ? (
            <EmptyState
              title={tab === 'upcoming' ? 'Chưa có lịch khảo sát sắp tới' : 'Chưa có lịch nào đã qua'}
              description={tab === 'upcoming' ? 'Khi kinh doanh phân công lịch cho bạn, lịch sẽ hiện ở đây.' : undefined}
            />
          ) : (
            <div className="space-y-8">
              {byDay(shown).map(([day, items]) => (
                <section key={day} aria-labelledby={`day-${day}`}>
                  <h2 id={`day-${day}`} className="text-title font-semibold">
                    {relativeDay(day, today)}
                    {/* "Hôm nay" / "Ngày mai" kèm thứ, ngày; ngày khác thì relativeDay đã là thứ, ngày. */}
                    {relativeDay(day, today) !== formatDay(day) && <span className="font-normal text-fg-2">, {formatDay(day)}</span>}
                  </h2>
                  <ul className="mt-2 divide-y divide-line">
                    {items.map((r) => {
                      const status = appointmentStatusMeta(r.status, 'technician')
                      return (
                        <ListRow key={r.appointmentId}>
                          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-start">
                            <p className="tnum text-title font-semibold text-fg">{formatTimeRange(r.startsAt, r.endsAt)}</p>
                            <div className="min-w-0">
                              <h3 className="text-body font-semibold text-fg">{r.propertyName}</h3>
                              <p className="mt-0.5 text-body text-fg-2">{[r.district, r.province].filter(Boolean).join(', ')}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                              <Badge tone={tab === 'past' && status.tone === 'danger' ? 'neutral' : status.tone}>{status.label}</Badge>
                              <ButtonLink to={withId(ROUTES.tech.job, r.appointmentId)} size="sm" variant="soft">
                                {r.status === 'ASSIGNED' && tab === 'upcoming' ? 'Xem và nhận việc' : 'Xem chi tiết'}
                              </ButtonLink>
                            </div>
                          </div>
                        </ListRow>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )
        }
      </QueryBoundary>
    </>
  )
}
