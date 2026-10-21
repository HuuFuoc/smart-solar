import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { ListCell, ListCells, ListHead, ListRow } from '@/components/common/ui/list-row'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { formatArea } from '@/features/pre-surveys/preSurveyDisplay'
import {
  appointmentStatusMeta,
  assignmentSourceLabel,
  formatDay,
  formatMoment,
  formatTimeRange,
  ineligibleLabel,
  relativeDay,
  surfaceNameLabel,
  todayVn,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import {
  useAcceptAppointmentMutation,
  useMyAppointmentsQuery,
  useOpenAppointmentsQuery,
} from '@/hooks/useTechnicianJobs'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { OpenAppointmentView, TechnicianAppointmentListItem } from '@/types/res/technicianAppointmentsRes'

type Tab = 'open' | 'upcoming' | 'past'

/** Lịch chưa kết thúc là "sắp tới" (kể cả đang diễn ra) */
const isUpcoming = (a: { endsAt: string }, now: number) => new Date(a.endsAt).getTime() >= now

/* Nhóm theo ngày (giờ Việt Nam), giữ thứ tự đã sắp */
function byDay<T extends { startsAt: string }>(rows: T[]) {
  const groups = new Map<string, T[]>()
  for (const r of rows) {
    const day = vnDate(r.startsAt)
    groups.set(day, [...(groups.get(day) ?? []), r])
  }
  return [...groups]
}

function DayHeading({ day, today }: { day: string; today: string }) {
  return (
    <h2 id={`day-${day}`} className="text-title font-semibold">
      {relativeDay(day, today)}
      {/* "Hôm nay" / "Ngày mai" kèm thứ, ngày; ngày khác thì relativeDay đã là thứ, ngày */}
      {relativeDay(day, today) !== formatDay(day) && <span className="font-normal text-fg-2">, {formatDay(day)}</span>}
    </h2>
  )
}

/** Các tab dùng chung một bộ cột để chuyển tab không bị nhảy cột */
const COLUMNS = 'lg:grid-cols-[7rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_9rem]'
const OPEN_LABELS = ['Giờ', 'Công trình', 'Khu vực', 'Mặt lắp', 'Hạn nhận', '']
const MINE_LABELS = ['Giờ', 'Công trình', 'Cách nhận', 'Nhận lúc', 'Tình hình', '']

function JobTime({ job }: { job: { startsAt: string; endsAt: string } }) {
  return (
    <ListCell label="Giờ" wide>
      <span className="tnum text-title font-semibold">{formatTimeRange(job.startsAt, job.endsAt)}</span>
    </ListCell>
  )
}

function JobPlace({ name, area }: { name: string; area: (string | null)[] }) {
  return (
    <ListCell wide>
      <h3 className="font-semibold">{name}</h3>
      <p className="mt-0.5 text-meta text-fg-2">{area.filter(Boolean).join(', ')}</p>
    </ListCell>
  )
}

// Một lịch đang chờ người nhận. Chưa có địa chỉ cụ thể và số điện thoại khách cho tới khi nhận
function OpenJobRow({ job }: { job: OpenAppointmentView }) {
  const accept = useAcceptAppointmentMutation()
  const navigate = useNavigate()

  async function onAccept() {
    try {
      await accept.mutateAsync({ id: job.appointmentId, revision: job.revision })
      toast.success('Đã nhận việc. Khách và kinh doanh sẽ thấy bạn phụ trách lịch này.')
      navigate(withId(ROUTES.tech.job, job.appointmentId))
    } catch (e) {
      // Người khác nhận trước (409): danh sách tự tải lại, dòng này sẽ biến mất
      toast.error(errorMessage(e))
    }
  }

  return (
    <ListRow>
      <ListCells columns={COLUMNS}>
        <JobTime job={job} />
        <JobPlace name={job.propertyName} area={[job.ward, job.province]} />
        <ListCell label="Khu vực">{job.zone?.name ?? '—'}</ListCell>
        <ListCell label="Mặt lắp">
          {surfaceNameLabel(job.installationSurfaceType)}, dùng được {formatArea(job.usableAreaM2)}
        </ListCell>
        <ListCell label="Hạn nhận">
          <span className="tnum">{formatMoment(job.acceptanceDeadlineAt)}</span>
        </ListCell>
        <ListCell wide className="lg:justify-self-end">
          {job.canAccept ? (
            <Button
              size="sm"
              variant="primary"
              icon="task_alt"
              disabled={accept.isPending}
              onClick={() => void onAccept()}
            >
              {accept.isPending ? 'Đang nhận…' : 'Nhận việc'}
            </Button>
          ) : (
            <p className="text-meta text-fg-2">Không nhận được: {ineligibleLabel(job.reason) ?? 'bận'}</p>
          )}
        </ListCell>
      </ListCells>
    </ListRow>
  )
}

function MyJobRow({ job, past }: { job: TechnicianAppointmentListItem; past: boolean }) {
  const status = appointmentStatusMeta(job.status, 'technician')
  return (
    <ListRow>
      <ListCells columns={COLUMNS}>
        <JobTime job={job} />
        <JobPlace name={job.propertyName} area={[job.district, job.province]} />
        <ListCell label="Cách nhận">{assignmentSourceLabel(job.assignmentSource, 'technician')}</ListCell>
        <ListCell label="Nhận lúc">
          <span className="tnum">{formatMoment(job.assignedAt)}</span>
        </ListCell>
        <ListCell label="Tình hình">
          <Badge tone={past ? 'neutral' : status.tone}>{status.label}</Badge>
        </ListCell>
        <ListCell wide className="lg:justify-self-end">
          <ButtonLink icon="visibility" to={withId(ROUTES.tech.job, job.appointmentId)} size="sm" variant="info">
            Xem chi tiết
          </ButtonLink>
        </ListCell>
      </ListCells>
    </ListRow>
  )
}

// Việc của kỹ thuật viên: lịch khách đặt trong khu vực của mình đang chờ người nhận (ai nhận trước được),
// và các lịch đã nhận, nhóm theo ngày
export function TechJobsPage() {
  const open = useOpenAppointmentsQuery()
  const mine = useMyAppointmentsQuery()
  const [picked, setPicked] = useState<Tab | null>(null)
  const [now] = useState(() => Date.now())
  const today = todayVn()
  const openRows = [...(open.data ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const rows = mine.data ?? []
  const upcoming = rows.filter((r) => isUpcoming(r, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = rows.filter((r) => !isUpcoming(r, now)).sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  const canTake = openRows.filter((r) => r.canAccept).length
  // Mở sẵn tab "Chờ nhận" khi có lịch nhận được
  const tab: Tab = picked ?? (canTake > 0 ? 'open' : 'upcoming')

  return (
    <>
      <PageHeader
        title="Việc của tôi"
        description={
          canTake > 0 ? (
            <Badge tone="danger" icon="assignment_late">
              {canTake} lịch trong khu vực đang chờ người nhận
            </Badge>
          ) : undefined
        }
        actions={
          <ButtonLink variant="info" to={ROUTES.tech.schedule} icon="calendar_month">
            Lịch làm việc
          </ButtonLink>
        }
      />
      <FilterChips
        label="Lọc lịch"
        className="mb-6"
        value={tab}
        onChange={setPicked}
        chips={[
          { value: 'open', label: 'Chờ nhận', count: openRows.length },
          { value: 'upcoming', label: 'Đã nhận, sắp tới', count: upcoming.length },
          { value: 'past', label: 'Đã qua', count: past.length },
        ]}
      />
      {tab === 'open' ? (
        <QueryBoundary query={open}>
          {() =>
            openRows.length === 0 ? (
              <EmptyState
                title="Không có lịch nào đang chờ"
                description="Khi khách trong khu vực của bạn đặt giờ khảo sát, lịch sẽ hiện ở đây để bạn nhận."
              />
            ) : (
              <div className="space-y-6">
                <ListHead columns={COLUMNS} labels={OPEN_LABELS} />
                {byDay(openRows).map(([day, items]) => (
                  <section key={day} aria-labelledby={`day-${day}`}>
                    <DayHeading day={day} today={today} />
                    <ul className="mt-2 divide-y divide-line">
                      {items.map((job) => (
                        <OpenJobRow key={job.appointmentId} job={job} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )
          }
        </QueryBoundary>
      ) : (
        <QueryBoundary query={mine}>
          {() => {
            const shown = tab === 'upcoming' ? upcoming : past
            if (shown.length === 0)
              return (
                <EmptyState
                  title={tab === 'upcoming' ? 'Chưa có lịch nào sắp tới' : 'Chưa có lịch nào đã qua'}
                  description={tab === 'upcoming' ? 'Nhận lịch ở tab "Chờ nhận" thì lịch hiện ở đây.' : undefined}
                />
              )
            return (
              <div className="space-y-6">
                <ListHead columns={COLUMNS} labels={MINE_LABELS} />
                {byDay(shown).map(([day, items]) => (
                  <section key={day} aria-labelledby={`day-${day}`}>
                    <DayHeading day={day} today={today} />
                    <ul className="mt-2 divide-y divide-line">
                      {items.map((job) => (
                        <MyJobRow key={job.appointmentId} job={job} past={tab === 'past'} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )
          }}
        </QueryBoundary>
      )}
    </>
  )
}
