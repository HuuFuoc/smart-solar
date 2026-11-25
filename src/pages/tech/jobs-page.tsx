import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { FilterMore } from '@/components/common/ui/filter-bar'
import { DateField, SearchInput, Select, TimeSelect } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { ListPager } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, Skeleton } from '@/components/common/ui/states'
import { formatArea, surfaceTypeLabel } from '@/features/pre-surveys/preSurveyDisplay'
import { DayGroupHeading } from '@/features/scheduling/DayGroupHeading'
import {
  assignmentSourceLabel,
  formatJobCode,
  formatMoment,
  formatTime,
  ineligibleLabel,
  technicianProgressMeta,
  todayVn,
} from '@/features/scheduling/schedulingDisplay'
import { byStartsAt, groupByDay } from '@/features/scheduling/scheduleOrder'
import { siteArea } from '@/features/scheduling/siteArea'
import { matchesJob } from '@/features/scheduling/techJobFilter'
import {
  useAcceptAppointmentMutation,
  useMyAppointmentsQuery,
  useOpenAppointmentsQuery,
} from '@/hooks/useTechnicianJobs'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { OpenAppointmentView, TechnicianAppointmentListItem } from '@/types/res/technicianAppointmentsRes'

type Tab = 'open' | 'upcoming' | 'past' | 'urgent'
type SortBy = 'nearest' | 'newest' | 'urgent'
type StatusFilter = 'all' | 'overdue' | 'upcoming' | 'in_progress' | 'completed'

const PAGE_SIZE = 5

/** Còn phải làm: theo trạng thái, không theo giờ hẹn (làm xong sớm thì hết việc ngay) */
const isActive = (a: TechnicianAppointmentListItem) => a.status !== 'COMPLETED'

function matchesStatus(item: TechnicianAppointmentListItem, filter: StatusFilter, now: number) {
  if (filter === 'all') return true
  if (filter === 'overdue') return item.isOverdue
  if (item.status === 'COMPLETED') return filter === 'completed'
  if (filter === 'completed') return false
  const start = new Date(item.startsAt).getTime()
  const end = new Date(item.endsAt).getTime()
  if (filter === 'in_progress') return now >= start && now < end
  return now < start && !item.isOverdue
}

// Sắp xếp quyết định việc nào lên trang đầu; trong một trang, các ngày vẫn theo groupByDay như mọi danh sách lịch
function sortMine(list: TechnicianAppointmentListItem[], sortBy: SortBy) {
  const at = (iso: string) => new Date(iso).getTime()
  return [...list].sort((a, b) => {
    if (sortBy === 'urgent' && a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    if (sortBy === 'newest') return at(b.assignedAt ?? b.startsAt) - at(a.assignedAt ?? a.startsAt)
    return at(a.startsAt) - at(b.startsAt)
  })
}

function JobCardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="sv-job">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <Skeleton className="h-16 w-full sm:w-28" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}

function TimeBlock({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  return (
    <div className="sv-time w-full shrink-0 sm:w-28">
      <p className="text-meta text-fg-2">Khung giờ</p>
      <p className="tnum text-title font-semibold text-fg">{formatTime(startsAt)}</p>
      <p className="tnum text-meta text-fg-2">đến {formatTime(endsAt)}</p>
    </div>
  )
}

function OpenJobCard({ job }: { job: OpenAppointmentView }) {
  const accept = useAcceptAppointmentMutation()
  const navigate = useNavigate()
  const to = withId(ROUTES.tech.openJob, job.appointmentId)
  const surface = job.installationSurfaceType ? surfaceTypeLabel(job.installationSurfaceType) : null

  async function onAccept() {
    try {
      await accept.mutateAsync({ id: job.appointmentId, revision: job.revision })
      toast.success('Đã nhận việc. Khách và kinh doanh sẽ thấy bạn phụ trách lịch này.')
      navigate(withId(ROUTES.tech.job, job.appointmentId))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <article className="sv-job">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-4 sm:flex-row sm:items-center">
          <TimeBlock startsAt={job.startsAt} endsAt={job.endsAt} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="flex flex-wrap items-center gap-x-3 text-meta text-fg-2">
              <span>{surface ? `Khảo sát ${surface.toLowerCase()}` : 'Khảo sát'}</span>
              <span className="font-mono">{formatJobCode(job.appointmentId, job.startsAt)}</span>
            </p>
            <Link to={to} className="block truncate text-title font-semibold text-fg hover:text-accent-fg">
              {job.propertyName}
            </Link>
            <p className="truncate text-meta text-fg-2">{siteArea([job.ward, job.district], job.province)}</p>
            <p className="sv-meta-row text-meta text-fg-2">
              <span>
                Hạn nhận <span className="tnum font-medium text-fg">{formatMoment(job.acceptanceDeadlineAt)}</span>
              </span>
              <span>
                Dùng được <span className="tnum font-medium text-fg">{formatArea(job.usableAreaM2)}</span>
              </span>
              {job.zone?.name && (
                <span>
                  Khu vực <span className="font-medium text-fg">{job.zone.name}</span>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-end">
          {job.canAccept ? (
            <Badge tone="info">Chờ nhận việc</Badge>
          ) : (
            <Badge>{ineligibleLabel(job.reason) ?? 'Bận lịch khác'}</Badge>
          )}
          <div className="flex items-center gap-2">
            <ButtonLink to={to} variant="info" size="sm" icon="visibility">
              Xem chi tiết
              <span className="sr-only"> {job.propertyName}</span>
            </ButtonLink>
            <Button
              variant="soft"
              size="sm"
              icon="task_alt"
              disabled={!job.canAccept || accept.isPending}
              onClick={() => void onAccept()}
            >
              {accept.isPending ? 'Đang nhận…' : 'Nhận việc'}
              <span className="sr-only"> {job.propertyName}</span>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function MyJobCard({ job, now }: { job: TechnicianAppointmentListItem; now: number }) {
  const to = withId(ROUTES.tech.job, job.appointmentId)
  const progress = technicianProgressMeta(job, now)
  return (
    <article className="sv-job">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-4 sm:flex-row sm:items-center">
          <TimeBlock startsAt={job.startsAt} endsAt={job.endsAt} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-mono text-meta text-fg-2">{formatJobCode(job.appointmentId, job.startsAt)}</p>
            <Link to={to} className="block truncate text-title font-semibold text-fg hover:text-accent-fg">
              {job.propertyName}
            </Link>
            <p className="truncate text-meta text-fg-2">
              {siteArea([job.communeName ?? job.ward ?? job.district], job.province)}
            </p>
            <p className="sv-meta-row text-meta text-fg-2">
              <span>
                Nhận việc{' '}
                <span className="font-medium text-fg">{assignmentSourceLabel(job.assignmentSource, 'technician')}</span>
              </span>
              {job.assignedAt && (
                <span>
                  Lúc <span className="tnum font-medium text-fg">{formatMoment(job.assignedAt)}</span>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-end">
          <Badge tone={progress.tone}>{progress.label}</Badge>
          <ButtonLink to={to} variant="info" size="sm" icon="visibility">
            Xem chi tiết
            <span className="sr-only"> {job.propertyName}</span>
          </ButtonLink>
        </div>
      </div>
    </article>
  )
}

function DaySections<T extends { startsAt: string; appointmentId: string }>({
  rows,
  card,
}: {
  rows: T[]
  card: (row: T) => ReactNode
}) {
  const today = todayVn()
  return (
    <div className="space-y-6">
      {groupByDay(rows).map(([day, items]) => (
        <section key={day} className="space-y-3">
          <DayGroupHeading day={day} today={today} count={items.length} unit="công việc" />
          <div className="space-y-3">{items.map((item) => card(item))}</div>
        </section>
      ))}
    </div>
  )
}

// Lịch khảo sát của kỹ thuật viên: chờ nhận (trong khu vực, chưa ai nhận), đã nhận (sắp tới hoặc quá giờ chưa khảo
// sát), đã khảo sát, khẩn cấp (quá giờ chưa khảo sát). Lọc, sắp xếp, phân trang ở máy vì backend trả cả danh sách
export function TechJobsPage() {
  const open = useOpenAppointmentsQuery()
  const mine = useMyAppointmentsQuery()
  const [picked, setPicked] = useState<Tab | null>(null)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('nearest')
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const [now] = useState(() => Date.now())

  const openRows = useMemo(
    () => (open.data ?? []).filter((j) => matchesJob(j, search, date, time)).sort(byStartsAt),
    [open.data, search, date, time],
  )
  const mineRows = useMemo(() => {
    const out = {
      upcoming: [] as TechnicianAppointmentListItem[],
      past: [] as TechnicianAppointmentListItem[],
      urgent: [] as TechnicianAppointmentListItem[],
    }
    for (const job of mine.data ?? []) {
      if (!matchesJob(job, search, date, time)) continue
      if (job.isOverdue) out.urgent.push(job)
      if (!matchesStatus(job, statusFilter, now)) continue
      out[isActive(job) ? 'upcoming' : 'past'].push(job)
    }
    return out
  }, [mine.data, search, date, time, statusFilter, now])

  const canTake = (open.data ?? []).filter((j) => j.canAccept).length
  const overdue = (mine.data ?? []).filter((j) => j.isOverdue).length
  const toDo = (mine.data ?? []).filter(isActive).length
  const tab: Tab = picked ?? (canTake > 0 ? 'open' : 'upcoming')
  const hasFilter = search.trim() !== '' || date !== '' || time !== '' || statusFilter !== 'all'

  const list = tab === 'open' ? openRows : sortMine(mineRows[tab], sortBy)
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const shown = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const pick = (next: Tab) => {
    setPicked(next)
    setPage(1)
  }
  // Mọi bộ lọc đổi thì về trang đầu
  const filtered =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setPage(1)
    }
  const resetFilters = () => {
    setSearch('')
    setDate('')
    setTime('')
    setStatusFilter('all')
    setPage(1)
  }

  async function refresh() {
    setRefreshing(true)
    try {
      await Promise.all([open.refetch({ throwOnError: true }), mine.refetch({ throwOnError: true })])
      toast.success('Đã cập nhật danh sách công việc.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setRefreshing(false)
    }
  }

  const emptyFiltered = (
    <EmptyState
      title="Không tìm thấy lịch phù hợp"
      description="Thử đổi từ khoá, ngày, giờ hoặc trạng thái."
      action={
        <Button variant="ghost" bleed={false} icon="filter_alt_off" onClick={resetFilters}>
          Xoá lọc
        </Button>
      }
    />
  )

  const pager = (
    <ListPager
      page={current}
      pages={pages}
      from={list.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1}
      to={Math.min(current * PAGE_SIZE, list.length)}
      total={list.length}
      noun="công việc"
      onChange={setPage}
    />
  )

  return (
    <>
      <PageHeader
        title="Danh sách công việc khảo sát"
        description={
          <span className="flex flex-wrap gap-x-3">
            <span className="tnum">{toDo} công việc cần xử lý</span>
            {overdue > 0 && <Badge tone="danger">{overdue} lịch đã qua giờ hẹn mà chưa khảo sát</Badge>}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" icon="refresh" disabled={refreshing} onClick={() => void refresh()}>
              {refreshing ? 'Đang làm mới…' : 'Làm mới'}
            </Button>
            <ButtonLink variant="info" to={ROUTES.tech.schedule} icon="calendar_month">
              Lịch làm việc
            </ButtonLink>
            <Button variant="primary" icon="add" onClick={() => pick('open')}>
              Nhận việc mới
            </Button>
          </>
        }
      />

      <div className="sv-card mb-4 space-y-3">
        <div role="search" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Tìm theo công trình, địa điểm, ngày, giờ</span>
            <SearchInput
              name="job-search"
              placeholder="Tìm theo công trình, địa điểm..."
              maxLength={100}
              value={search}
              onChange={(e) => filtered(setSearch)(e.target.value)}
              onClear={() => filtered(setSearch)('')}
            />
          </label>
          <FilterMore active={(date ? 1 : 0) + (time ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}>
            <DateField value={date} onChange={filtered(setDate)} label="Lọc theo ngày" />
            <TimeSelect
              value={time}
              onChange={filtered(setTime)}
              from="07:00"
              to="18:00"
              step={30}
              emptyLabel="Tất cả khung giờ"
              aria-label="Lọc theo giờ bắt đầu"
              active={time !== ''}
            />
            <Select
              aria-label="Trạng thái"
              active={statusFilter !== 'all'}
              disabled={tab === 'open' || tab === 'urgent'}
              value={statusFilter}
              onChange={(e) => filtered(setStatusFilter)(e.target.value as StatusFilter)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="overdue">Quá giờ, chưa khảo sát</option>
              <option value="upcoming">Sắp tới</option>
              <option value="in_progress">Đang trong giờ hẹn</option>
              <option value="completed">Đã khảo sát</option>
            </Select>
          </FilterMore>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-line pt-3 sm:flex-row sm:items-end">
          <FilterChips
            label="Lọc lịch khảo sát"
            className="min-w-0"
            value={tab}
            onChange={pick}
            chips={[
              { value: 'open', label: 'Chờ nhận', count: openRows.length },
              { value: 'upcoming', label: 'Đã nhận', count: mineRows.upcoming.length },
              { value: 'past', label: 'Đã khảo sát', count: mineRows.past.length },
              { value: 'urgent', label: 'Khẩn cấp', count: mineRows.urgent.length },
            ]}
          />
          {tab !== 'open' && (
            <label className="flex shrink-0 items-center gap-2 text-meta whitespace-nowrap text-fg-2">
              Sắp xếp
              <Select
                value={sortBy}
                className="w-full sm:w-56"
                onChange={(e) => filtered(setSortBy)(e.target.value as SortBy)}
              >
                <option value="nearest">Giờ hẹn gần nhất</option>
                <option value="newest">Mới giao gần nhất</option>
                <option value="urgent">Quá giờ lên trước</option>
              </Select>
            </label>
          )}
        </div>
      </div>

      {tab === 'open' ? (
        <QueryBoundary query={open} fallback={<JobCardSkeleton />}>
          {() =>
            shown.length === 0 ? (
              hasFilter ? (
                emptyFiltered
              ) : (
                <EmptyState
                  title="Không có lịch nào đang chờ người nhận"
                  action={
                    mineRows.upcoming.length > 0 ? (
                      <Button variant="info" icon="event_available" onClick={() => pick('upcoming')}>
                        Xem lịch đã nhận
                      </Button>
                    ) : undefined
                  }
                />
              )
            ) : (
              <>
                <DaySections
                  rows={shown as OpenAppointmentView[]}
                  card={(j) => <OpenJobCard key={j.appointmentId} job={j} />}
                />
                {pager}
              </>
            )
          }
        </QueryBoundary>
      ) : (
        <QueryBoundary query={mine} fallback={<JobCardSkeleton />}>
          {() =>
            shown.length === 0 ? (
              hasFilter ? (
                emptyFiltered
              ) : (
                <EmptyState
                  title={
                    tab === 'urgent'
                      ? 'Không có lịch nào quá giờ'
                      : tab === 'past'
                        ? 'Chưa có lịch nào đã qua'
                        : 'Chưa có lịch nào cần làm'
                  }
                  action={
                    tab === 'upcoming' && canTake > 0 ? (
                      <Button variant="info" icon="pending_actions" onClick={() => pick('open')}>
                        Xem lịch chờ nhận
                      </Button>
                    ) : undefined
                  }
                />
              )
            ) : (
              <>
                <DaySections
                  rows={shown as TechnicianAppointmentListItem[]}
                  card={(j) => <MyJobCard key={j.appointmentId} job={j} now={now} />}
                />
                {pager}
              </>
            )
          }
        </QueryBoundary>
      )}
    </>
  )
}
