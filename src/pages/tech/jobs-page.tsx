import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { DateField, SearchInput } from '@/components/common/ui/field'
import { PageHeader } from '@/components/common/ui/page-header'
import { ListPager } from '@/components/common/ui/pagination'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState, Skeleton } from '@/components/common/ui/states'
import { formatArea, surfaceTypeLabel } from '@/features/pre-surveys/preSurveyDisplay'
import {
  DAY_STYLES,
  assignmentSourceLabel,
  formatMoment,
  formatTime,
  ineligibleLabel,
  todayVn,
  vnDate,
  weekdayOf,
} from '@/features/scheduling/schedulingDisplay'
import { groupByDay } from '@/features/scheduling/scheduleOrder'
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
import { cx } from '@/utils/cx'

type Tab = 'open' | 'upcoming' | 'past' | 'urgent'
type SortBy = 'nearest' | 'newest' | 'urgent'
type StatusFilter = 'all' | 'overdue' | 'upcoming' | 'in_progress' | 'completed'

/** Lịch chưa kết thúc hoặc quá giờ mà chưa khảo sát */
const isActive = (a: TechnicianAppointmentListItem, now: number) => a.isOverdue || new Date(a.endsAt).getTime() >= now

function formatJobCode(appointmentId: string, startsAt: string) {
  const datePart = vnDate(startsAt).replace(/-/g, '').slice(0, 6)
  const lastPart = appointmentId.length > 3 ? appointmentId.slice(-3).toUpperCase() : appointmentId
  return `#JOB-${datePart}-${lastPart}`
}

function formatGroupDayTitle(day: string, today: string) {
  const w = weekdayOf(day)
  const dayStyle = DAY_STYLES[w]
  const dayName = dayStyle ? dayStyle.name : 'Thứ Hai'
  const [y, m, d] = day.split('-')
  const dateFormatted = `${d}/${m}/${y}`
  if (day === today) {
    return `HÔM NAY — ${dayName.toUpperCase()}, ${dateFormatted}`
  }
  return `${dayName.toUpperCase()}, ${dateFormatted}`
}

function JobCardSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-container border border-line bg-canvas p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <Skeleton className="h-24 w-full rounded-control sm:w-32" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48 rounded-control" />
              <Skeleton className="h-6 w-3/4 rounded-control" />
              <Skeleton className="h-4 w-1/2 rounded-control" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-control" />
              <Skeleton className="h-9 w-28 rounded-control" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function OpenJobCard({ job }: { job: OpenAppointmentView }) {
  const accept = useAcceptAppointmentMutation()
  const navigate = useNavigate()

  async function onAccept() {
    try {
      await accept.mutateAsync({ id: job.appointmentId, revision: job.revision })
      toast.success('Đã nhận việc. Khách và kinh doanh sẽ thấy bạn phụ trách lịch này.')
      navigate(withId(ROUTES.tech.job, job.appointmentId))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const detailUrl = withId(ROUTES.tech.openJob, job.appointmentId)
  const surfaceLabel = surfaceTypeLabel(job.installationSurfaceType)
  const categoryText = surfaceLabel ? `Khảo sát ${surfaceLabel}` : 'Khảo sát hệ thống Solar'
  const jobCode = formatJobCode(job.appointmentId, job.startsAt)
  const address = siteArea([job.ward, job.district], job.province)

  return (
    <div className="sv-job" data-tone="info">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="sv-time w-full shrink-0 sm:w-28 md:w-32">
            <p className="sv-label text-meta font-semibold">Khung giờ</p>
            <p className="tnum mt-0.5 text-title font-bold leading-tight text-fg">{formatTime(job.startsAt)}</p>
            <p className="tnum mt-0.5 text-meta leading-tight text-fg-2">đến {formatTime(job.endsAt)}</p>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sv-tag" data-tone="info">
                {categoryText}
              </span>
              <span className="font-mono text-meta text-fg-3">{jobCode}</span>
            </div>

            <Link
              to={detailUrl}
              className="block truncate text-title font-bold text-fg hover:text-accent-fg"
              title={job.propertyName}
            >
              {job.propertyName}
            </Link>

            <div className="flex items-center gap-1.5 text-meta text-fg-2">
              <Icon name="location_on" className="shrink-0 text-[16px] text-fg-3" />
              <span className="truncate">{address}</span>
            </div>

            <div className="sv-meta-row text-meta text-fg-3">
              <span>
                Hạn nhận: <b className="font-medium text-fg-2">{formatMoment(job.acceptanceDeadlineAt)}</b>
              </span>
              <span className="sv-dot" aria-hidden />
              <span>
                Dùng được <b className="font-medium text-fg-2">{formatArea(job.usableAreaM2)}</b>
              </span>
              {job.zone?.name && (
                <>
                  <span className="sv-dot" aria-hidden />
                  <span>
                    Khu vực <b className="font-medium text-fg-2">{job.zone.name}</b>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 lg:flex-col lg:items-end lg:justify-center">
          {job.canAccept ? (
            <span className="sv-tag" data-tone="info" data-shape="pill">
              <Icon name="pending_actions" className="text-[16px]" />
              <span>Chờ nhận việc</span>
            </span>
          ) : (
            <span className="sv-tag" data-tone="neutral" data-shape="pill">
              <span>{ineligibleLabel(job.reason) ?? 'Bận lịch khác'}</span>
            </span>
          )}

          <div className="flex items-center gap-2">
            <ButtonLink to={detailUrl} variant="secondary" size="sm" icon="visibility">
              Chi tiết
            </ButtonLink>
            <Button
              variant="primary"
              size="sm"
              icon="task_alt"
              disabled={!job.canAccept || accept.isPending}
              onClick={() => void onAccept()}
            >
              {accept.isPending ? 'Đang nhận…' : 'Nhận việc'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MyJobCard({ job, now }: { job: TechnicianAppointmentListItem; now: number }) {
  const detailUrl = withId(ROUTES.tech.job, job.appointmentId)
  const startMs = new Date(job.startsAt).getTime()
  const endMs = new Date(job.endsAt).getTime()
  const inProgress = now >= startMs && now < endMs
  const upcoming = now < startMs
  const jobCode = formatJobCode(job.appointmentId, job.startsAt)
  const address = siteArea([job.communeName ?? job.ward ?? job.district], job.province)

  const tone = job.isOverdue ? 'danger' : !isActive(job, now) ? 'warn' : 'ok'

  const isSelf = job.assignmentSource === 'SELF_ACCEPTED'
  const sourceLabel = isSelf ? 'Nguồn' : 'Phân công'
  const sourceValue = isSelf ? 'Bạn tự nhận' : assignmentSourceLabel(job.assignmentSource, 'technician')

  return (
    <div className="sv-job" data-tone={tone}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="sv-time w-full shrink-0 sm:w-28 md:w-32">
            <p className="sv-label text-meta font-semibold">Khung giờ</p>
            <p className="tnum mt-0.5 text-title font-bold leading-tight text-fg">{formatTime(job.startsAt)}</p>
            <p className="tnum mt-0.5 text-meta leading-tight text-fg-2">đến {formatTime(job.endsAt)}</p>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sv-tag" data-tone="ok">
                Khảo sát hệ thống Solar Áp Mái
              </span>
              <span className="font-mono text-meta text-fg-3">{jobCode}</span>
            </div>

            <Link
              to={detailUrl}
              className="block truncate text-title font-bold text-fg hover:text-accent-fg"
              title={job.propertyName}
            >
              {job.propertyName}
            </Link>

            <div className="flex items-center gap-1.5 text-meta text-fg-2">
              <Icon name="location_on" className="shrink-0 text-[16px] text-fg-3" />
              <span className="truncate">{address}</span>
            </div>

            <div className="sv-meta-row text-meta text-fg-3">
              <Icon name="person" className="shrink-0 text-[16px]" />
              <span>
                {sourceLabel}: <b className="font-medium text-fg-2">{sourceValue}</b>
              </span>
              {job.assignedAt && (
                <>
                  <span className="sv-dot" aria-hidden />
                  <span>
                    Giao lúc: <b className="font-medium text-fg-2">{formatMoment(job.assignedAt)}</b>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 lg:flex-col lg:items-end lg:justify-center">
          {job.isOverdue ? (
            <span className="sv-tag" data-tone="danger" data-shape="pill">
              <Icon name="error_outline" className="text-[16px]" />
              <span>Quá giờ, chưa khảo sát</span>
            </span>
          ) : inProgress ? (
            <span className="sv-tag" data-tone="info" data-shape="pill">
              <Icon name="schedule" className="text-[16px]" />
              <span>Đang trong giờ hẹn</span>
            </span>
          ) : upcoming ? (
            <span className="sv-tag" data-tone="ok" data-shape="pill">
              <span className="size-1.5 rounded-full bg-ok" />
              <span>Sắp diễn ra</span>
            </span>
          ) : job.status === 'COMPLETED' ? (
            <span className="sv-tag" data-tone="neutral" data-shape="pill">
              <Icon name="check_circle" className="text-[16px]" />
              <span>Đã khảo sát</span>
            </span>
          ) : (
            <span className="sv-tag" data-tone="warn" data-shape="pill">
              <Icon name="warning" className="text-[16px]" />
              <span>Chưa chốt biên bản</span>
            </span>
          )}

          <div className="flex items-center gap-2">
            <ButtonLink to={detailUrl} variant="secondary" size="sm" icon="visibility">
              Chi tiết
            </ButtonLink>
            {job.isOverdue ? (
              <ButtonLink to={detailUrl} variant="danger-solid" size="sm" icon="assignment_late">
                Khảo sát ngay
              </ButtonLink>
            ) : upcoming || inProgress ? (
              <ButtonLink to={detailUrl} variant="primary" size="sm" icon="play_arrow">
                Bắt đầu làm
              </ButtonLink>
            ) : (
              <ButtonLink to={detailUrl} variant="secondary" size="sm" icon="description">
                Tải biên bản
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

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

  const openRows = useMemo(() => open.data ?? [], [open.data])
  const rows = useMemo(() => mine.data ?? [], [mine.data])
  const upcoming = useMemo(() => rows.filter((r) => isActive(r, now)), [rows, now])
  const past = useMemo(() => rows.filter((r) => !isActive(r, now)), [rows, now])
  const urgent = useMemo(() => upcoming.filter((r) => r.isOverdue), [upcoming])

  const canTake = openRows.filter((r) => r.canAccept).length
  const tab: Tab = picked ?? (canTake > 0 ? 'open' : 'upcoming')

  const filterStatus = useCallback(
    (item: TechnicianAppointmentListItem) => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'overdue') return item.isOverdue
      if (statusFilter === 'completed') return item.status === 'COMPLETED'
      const s = new Date(item.startsAt).getTime()
      const e = new Date(item.endsAt).getTime()
      if (statusFilter === 'in_progress') return now >= s && now < e
      if (statusFilter === 'upcoming') return now < s && !item.isOverdue
      return true
    },
    [statusFilter, now],
  )

  const filteredOpen = useMemo(
    () => openRows.filter((j) => matchesJob(j, search, date, time)),
    [openRows, search, date, time],
  )
  const filteredUpcoming = useMemo(
    () => upcoming.filter((j) => matchesJob(j, search, date, time) && filterStatus(j)),
    [upcoming, search, date, time, filterStatus],
  )
  const filteredPast = useMemo(
    () => past.filter((j) => matchesJob(j, search, date, time) && filterStatus(j)),
    [past, search, date, time, filterStatus],
  )
  const filteredUrgent = useMemo(
    () => urgent.filter((j) => matchesJob(j, search, date, time)),
    [urgent, search, date, time],
  )

  const openActiveJobs = useMemo(() => {
    return filteredOpen
  }, [filteredOpen])

  const myActiveJobs = useMemo(() => {
    let list: TechnicianAppointmentListItem[] = []
    if (tab === 'upcoming') list = [...filteredUpcoming]
    else if (tab === 'past') list = [...filteredPast]
    else if (tab === 'urgent') list = [...filteredUrgent]

    list.sort((a, b) => {
      if (sortBy === 'urgent') {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
        return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      }
      if (sortBy === 'newest') {
        const timeA = new Date(a.assignedAt ?? a.startsAt).getTime()
        const timeB = new Date(b.assignedAt ?? b.startsAt).getTime()
        return timeB - timeA
      }
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    })
    return list
  }, [tab, filteredUpcoming, filteredPast, filteredUrgent, sortBy])

  const pageSize = 5
  const totalItems = tab === 'open' ? openActiveJobs.length : myActiveJobs.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(page, totalPages)

  const paginatedOpenJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return openActiveJobs.slice(start, start + pageSize)
  }, [openActiveJobs, currentPage, pageSize])

  const paginatedMyJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return myActiveJobs.slice(start, start + pageSize)
  }, [myActiveJobs, currentPage, pageSize])

  const groupedOpen = useMemo(() => groupByDay(paginatedOpenJobs), [paginatedOpenJobs])
  const groupedMy = useMemo(() => groupByDay(paginatedMyJobs), [paginatedMyJobs])

  const today = todayVn()
  const hasFilter = search.trim() !== '' || date !== '' || time !== '' || statusFilter !== 'all'

  const resetFilters = () => {
    setSearch('')
    setDate('')
    setTime('')
    setStatusFilter('all')
    setPage(1)
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await Promise.all([open.refetch(), mine.refetch()])
      toast.success('Đã cập nhật danh sách công việc mới nhất.')
    } finally {
      setRefreshing(false)
    }
  }

  function renderJobSections<T extends OpenAppointmentView | TechnicianAppointmentListItem>(
    groupedList: [string, T[]][],
    isOpenTab: boolean,
  ) {
    return (
      <div className="space-y-6">
        {groupedList.map(([day, items]) => {
          const isToday = day === today
          const isPastDay = day < today
          const title = formatGroupDayTitle(day, today)
          const hint = isToday
            ? 'Lịch ưu tiên cao trong ngày'
            : isPastDay
              ? 'Cần hoàn tất báo cáo'
              : 'Lịch hẹn khách hàng'

          return (
            <section key={day} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className={cx('size-2.5 rounded-full', isToday ? 'bg-danger' : 'bg-ok')} />
                  <h2 className="sv-heading text-body font-bold text-fg">{title}</h2>
                  <span className="sv-tag" data-tone={isToday ? 'danger' : 'ok'} data-shape="pill">
                    {items.length} công việc
                  </span>
                </div>
                <span
                  className={cx(
                    'inline-flex items-center gap-1.5 text-meta',
                    isToday ? 'font-medium text-danger' : 'text-fg-3',
                  )}
                >
                  {isToday && <Icon name="warning" className="text-[16px]" />}
                  {hint}
                </span>
              </div>

              <div className="space-y-3">
                {items.map((item) =>
                  isOpenTab ? (
                    <OpenJobCard key={item.appointmentId} job={item as OpenAppointmentView} />
                  ) : (
                    <MyJobCard key={item.appointmentId} job={item as TechnicianAppointmentListItem} now={now} />
                  ),
                )}
              </div>
            </section>
          )
        })}

        <ListPager
          page={currentPage}
          pages={totalPages}
          from={totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
          to={Math.min(currentPage * pageSize, totalItems)}
          total={totalItems}
          noun="công việc"
          onChange={setPage}
        />
      </div>
    )
  }

  return (
    <div className="sv-list">
      <div className="mb-2 flex items-center gap-1.5 text-meta text-fg-3">
        <span>Kỹ thuật hiện trường</span>
        <span className="text-fg-3">/</span>
        <span className="text-fg-2">Khảo sát</span>
      </div>

      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-3">
            <span>Danh sách công việc kỹ thuật</span>
            <span className="rounded-control bg-ok-soft px-2.5 py-1 text-meta font-medium text-ok">
              {upcoming.length} công việc cần xử lý
            </span>
          </div>
        }
        actions={
          <>
            <Button variant="secondary" icon="refresh" disabled={refreshing} onClick={() => void handleRefresh()}>
              Làm mới
            </Button>
            <ButtonLink variant="secondary" to={ROUTES.tech.schedule} icon="calendar_month">
              Lịch làm việc
            </ButtonLink>
            <Button
              variant="primary"
              icon="add"
              onClick={() => {
                setPicked('open')
                setPage(1)
              }}
            >
              + Nhận việc mới
            </Button>
          </>
        }
      />

      <div className="sv-card mb-6 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <SearchInput
              name="job-search"
              placeholder="Tìm theo tên công trình, địa chỉ, người..."
              maxLength={100}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              onClear={() => {
                setSearch('')
                setPage(1)
              }}
            />
          </div>

          <div>
            <DateField
              value={date}
              onChange={(val) => {
                setDate(val)
                setPage(1)
              }}
              label="Lọc theo ngày"
            />
          </div>

          <div>
            <select
              aria-label="Khung giờ"
              value={time}
              onChange={(e) => {
                setTime(e.target.value)
                setPage(1)
              }}
              className="h-11 w-full rounded-control border border-line bg-canvas px-3 text-meta text-fg focus:outline-hidden lg:h-9"
            >
              <option value="">Tất cả khung giờ</option>
              <option value="07:30">07:30 - 09:00</option>
              <option value="08:00">08:00 - 09:30</option>
              <option value="08:30">08:30 - 10:00</option>
              <option value="09:30">09:30 - 11:00</option>
              <option value="13:00">13:00 - 14:30</option>
              <option value="14:30">14:30 - 16:00</option>
              <option value="16:00">16:00 - 17:30</option>
            </select>
          </div>

          <div>
            <select
              aria-label="Trạng thái"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter)
                setPage(1)
              }}
              className="h-11 w-full rounded-control border border-line bg-canvas px-3 text-meta text-fg focus:outline-hidden lg:h-9"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="overdue">Quá giờ, chưa khảo sát</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="in_progress">Đang trong giờ hẹn</option>
              <option value="completed">Đã hoàn thành</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-line pt-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPicked('open')
                setPage(1)
              }}
              className={cx(
                'press inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-meta transition-colors',
                tab === 'open'
                  ? 'border border-ok bg-ok-soft/40 font-semibold text-ok'
                  : 'border border-line bg-canvas text-fg-2 hover:bg-hover hover:text-fg',
              )}
            >
              <span>Chờ nhận</span>
              <span
                className={cx(
                  'rounded-control px-1.5 py-0.5 text-meta font-medium',
                  tab === 'open' ? 'bg-ok text-on-accent' : 'bg-surface-2 text-fg-3',
                )}
              >
                {filteredOpen.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPicked('upcoming')
                setPage(1)
              }}
              className={cx(
                'press inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-meta transition-colors',
                tab === 'upcoming'
                  ? 'border border-ok bg-ok-soft/40 font-semibold text-ok'
                  : 'border border-line bg-canvas text-fg-2 hover:bg-hover hover:text-fg',
              )}
            >
              <span>Đã nhận</span>
              <span
                className={cx(
                  'rounded-control px-1.5 py-0.5 text-meta font-medium',
                  tab === 'upcoming' ? 'bg-ok text-on-accent' : 'bg-surface-2 text-fg-3',
                )}
              >
                {filteredUpcoming.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPicked('past')
                setPage(1)
              }}
              className={cx(
                'press inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-meta transition-colors',
                tab === 'past'
                  ? 'border border-ok bg-ok-soft/40 font-semibold text-ok'
                  : 'border border-line bg-canvas text-fg-2 hover:bg-hover hover:text-fg',
              )}
            >
              <span>Đã qua</span>
              <span
                className={cx(
                  'rounded-control px-1.5 py-0.5 text-meta font-medium',
                  tab === 'past' ? 'bg-ok text-on-accent' : 'bg-surface-2 text-fg-3',
                )}
              >
                {filteredPast.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPicked('urgent')
                setPage(1)
              }}
              className={cx(
                'press inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-meta transition-colors',
                tab === 'urgent'
                  ? 'border border-danger bg-danger-soft/40 font-semibold text-danger'
                  : 'border border-line bg-canvas text-fg-2 hover:bg-hover hover:text-fg',
              )}
            >
              <span>Khẩn cấp</span>
              <span className="rounded-control bg-danger-soft px-1.5 py-0.5 text-meta font-bold text-danger">
                {filteredUrgent.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-meta text-fg-2">
            <span>Sắp xếp theo:</span>
            <select
              aria-label="Sắp xếp"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortBy)
                setPage(1)
              }}
              className="h-8 rounded-control border border-line bg-canvas px-2 text-meta text-fg focus:outline-hidden"
            >
              <option value="nearest">Thời gian biểu gần nhất</option>
              <option value="newest">Mới giao gần nhất</option>
              <option value="urgent">Việc khẩn cấp lên trước</option>
            </select>
          </div>
        </div>
      </div>

      {tab === 'open' ? (
        <QueryBoundary query={open} fallback={<JobCardSkeleton />}>
          {() => {
            if (openActiveJobs.length === 0) {
              if (hasFilter) {
                return (
                  <EmptyState
                    title="Không tìm thấy lịch phù hợp"
                    description="Thử đổi từ khoá, ngày hoặc khung giờ."
                    action={
                      <Button variant="secondary" icon="filter_alt_off" onClick={resetFilters}>
                        Xoá lọc
                      </Button>
                    }
                  />
                )
              }
              return (
                <EmptyState
                  title="Không có lịch nào đang chờ người nhận"
                  action={
                    upcoming.length > 0 ? (
                      <Button variant="info" icon="event_available" onClick={() => setPicked('upcoming')}>
                        Xem lịch đã nhận
                      </Button>
                    ) : undefined
                  }
                />
              )
            }
            return renderJobSections(groupedOpen, true)
          }}
        </QueryBoundary>
      ) : (
        <QueryBoundary query={mine} fallback={<JobCardSkeleton />}>
          {() => {
            if (myActiveJobs.length === 0) {
              if (hasFilter) {
                return (
                  <EmptyState
                    title="Không tìm thấy lịch phù hợp"
                    description="Thử đổi từ khoá, ngày hoặc khung giờ."
                    action={
                      <Button variant="secondary" icon="filter_alt_off" onClick={resetFilters}>
                        Xoá lọc
                      </Button>
                    }
                  />
                )
              }
              if (tab === 'urgent') {
                return <EmptyState title="Hiện tại không có công việc khẩn cấp nào" />
              }
              if (tab === 'past') {
                return <EmptyState title="Chưa có lịch nào đã qua" />
              }
              return (
                <EmptyState
                  title="Chưa có lịch nào cần làm"
                  action={
                    canTake > 0 ? (
                      <Button variant="info" icon="pending_actions" onClick={() => setPicked('open')}>
                        Xem lịch chờ nhận
                      </Button>
                    ) : undefined
                  }
                />
              )
            }
            return renderJobSections(groupedMy, false)
          }}
        </QueryBoundary>
      )}
    </div>
  )
}
