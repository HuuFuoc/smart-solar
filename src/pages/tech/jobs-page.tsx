import { Fragment, type ReactNode, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button, ButtonLink } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { Table, Td, Th, Tr } from '@/components/common/ui/table'
import { formatArea, surfaceTypeLabel } from '@/features/pre-surveys/preSurveyDisplay'
import {
  appointmentStatusMeta,
  assignmentSourceLabel,
  formatDay,
  formatMoment,
  formatTimeRange,
  ineligibleLabel,
  relativeDay,
  todayVn,
  vnDate,
} from '@/features/scheduling/schedulingDisplay'
import { TechJobFilterBar } from '@/features/scheduling/TechJobFilterBar'
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

type Tab = 'open' | 'upcoming' | 'past'

/** Lịch chưa kết thúc (kể cả đang diễn ra) hoặc đã quá giờ mà chưa khảo sát xong vẫn là việc phải làm */
const isActive = (a: TechnicianAppointmentListItem, now: number) => a.isOverdue || new Date(a.endsAt).getTime() >= now

/* Nhóm theo ngày (giờ Việt Nam), giữ thứ tự đã sắp */
function byDay<T extends { startsAt: string }>(rows: T[]) {
  const groups = new Map<string, T[]>()
  for (const r of rows) {
    const day = vnDate(r.startsAt)
    groups.set(day, [...(groups.get(day) ?? []), r])
  }
  return [...groups]
}

const OPEN_LABELS = ['Giờ', 'Công trình', 'Khu vực', 'Mặt lắp', 'Hạn nhận']
const MINE_LABELS = ['Giờ', 'Công trình', 'Cách nhận', 'Nhận lúc', 'Tình hình']

const DAY_STYLES: Record<number, { row: string; bar: string }> = {
  1: { row: 'day-header-mon', bar: 'day-bar-mon' }, // Thứ Hai
  2: { row: 'day-header-tue', bar: 'day-bar-tue' }, // Thứ Ba
  3: { row: 'day-header-wed', bar: 'day-bar-wed' }, // Thứ Tư
  4: { row: 'day-header-thu', bar: 'day-bar-thu' }, // Thứ Năm
  5: { row: 'day-header-fri', bar: 'day-bar-fri' }, // Thứ Sáu
  6: { row: 'day-header-sat', bar: 'day-bar-sat' }, // Thứ Bảy
  0: { row: 'day-header-sun', bar: 'day-bar-sun' }, // Chủ Nhật
}

function weekdayOf(date: string): number {
  const d = new Date(`${date}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? 1 : d.getUTCDay()
}

// Mỗi ngày là một nhóm dòng mở đầu bằng dải ngày. Dưới lg mỗi dòng xếp thành khối nhãn / giá trị
function JobTable<T extends { appointmentId: string; startsAt: string }>({
  labels,
  rows,
  today,
  row,
}: {
  labels: string[]
  rows: T[]
  today: string
  row: (job: T) => ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-container border border-line bg-canvas">
      <Table stack>
        <thead>
          <tr className="border-b border-line bg-surface-2">
            {labels.map((label) => (
              <Th key={label} className="px-4! py-3 font-semibold whitespace-nowrap lg:border-r lg:border-line">
                {label}
              </Th>
            ))}
            <Th className="w-px px-4! py-3 text-right whitespace-nowrap">
              <span className="sr-only">Thao tác</span>
            </Th>
          </tr>
        </thead>
        {byDay(rows).map(([day, items]) => {
          const weekday = weekdayOf(day)
          const style = DAY_STYLES[weekday] ?? DAY_STYLES[1]!
          return (
            <tbody key={day} className="divide-y divide-line">
              <tr className={cx(style.row, 'max-lg:py-2!')}>
                <th
                  colSpan={labels.length + 1}
                  scope="rowgroup"
                  className="border-b border-line px-4 py-2.5 text-left font-semibold max-lg:block max-lg:border-0 max-lg:py-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cx('inline-block h-4 w-1.5 rounded-control shrink-0', style.bar)}
                      aria-hidden="true"
                    />
                    <span>
                      {relativeDay(day, today)}
                      {/* "Hôm nay" / "Ngày mai" kèm thứ, ngày; ngày khác thì relativeDay đã là thứ, ngày */}
                      {relativeDay(day, today) !== formatDay(day) && (
                        <span className="font-normal opacity-80">, {formatDay(day)}</span>
                      )}
                    </span>
                  </div>
                </th>
              </tr>
              {items.map((job) => (
                <Fragment key={job.appointmentId}>{row(job)}</Fragment>
              ))}
            </tbody>
          )
        })}
      </Table>
    </div>
  )
}

function JobTime({ job }: { job: { startsAt: string; endsAt: string } }) {
  return (
    <Td
      label="Giờ"
      className="px-4! py-3.5 align-middle tnum font-semibold whitespace-nowrap lg:border-r lg:border-line"
    >
      {formatTimeRange(job.startsAt, job.endsAt)}
    </Td>
  )
}

function JobPlace({ name, area, to }: { name: string; area: (string | null)[]; to: string }) {
  return (
    <Td label="Công trình" className="px-4! py-3.5 align-middle lg:border-r lg:border-line">
      <Link to={to} className="ui-link font-semibold">
        {name}
      </Link>
      <p className="mt-0.5 text-meta text-fg-2">{area.filter(Boolean).join(', ')}</p>
    </Td>
  )
}

// Một lịch đang chờ người nhận. Chưa có địa chỉ cụ thể và số điện thoại khách cho tới khi nhận. Tên công trình mở trang
// chi tiết (tải lại từ backend trước khi nhận)
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
    <Tr>
      <JobTime job={job} />
      <JobPlace
        name={job.propertyName}
        area={[job.ward, job.province]}
        to={withId(ROUTES.tech.openJob, job.appointmentId)}
      />
      <Td label="Khu vực" className="px-4! py-3.5 align-middle whitespace-nowrap lg:border-r lg:border-line">
        {job.zone?.name ?? '—'}
      </Td>
      <Td label="Mặt lắp" className="px-4! py-3.5 align-middle lg:border-r lg:border-line">
        {surfaceTypeLabel(job.installationSurfaceType)}, dùng được {formatArea(job.usableAreaM2)}
      </Td>
      <Td label="Hạn nhận" className="px-4! py-3.5 align-middle tnum whitespace-nowrap lg:border-r lg:border-line">
        {formatMoment(job.acceptanceDeadlineAt)}
      </Td>
      <Td className="px-4! py-3.5 align-middle text-right whitespace-nowrap">
        {job.canAccept ? (
          <Button size="sm" variant="soft" icon="task_alt" disabled={accept.isPending} onClick={() => void onAccept()}>
            {accept.isPending ? 'Đang nhận…' : 'Nhận việc'}
          </Button>
        ) : (
          <span className="text-meta text-fg-2">Không nhận được: {ineligibleLabel(job.reason) ?? 'bận'}</span>
        )}
      </Td>
    </Tr>
  )
}

function MyJobRow({ job, past }: { job: TechnicianAppointmentListItem; past: boolean }) {
  const status = appointmentStatusMeta(job.status, 'technician')
  const to = withId(ROUTES.tech.job, job.appointmentId)
  return (
    <Tr>
      <JobTime job={job} />
      <JobPlace name={job.propertyName} area={[job.communeName ?? job.ward ?? job.district, job.province]} to={to} />
      <Td label="Cách nhận" className="px-4! py-3.5 align-middle whitespace-nowrap lg:border-r lg:border-line">
        {assignmentSourceLabel(job.assignmentSource, 'technician')}
      </Td>
      <Td label="Nhận lúc" className="px-4! py-3.5 align-middle tnum whitespace-nowrap lg:border-r lg:border-line">
        {formatMoment(job.assignedAt)}
      </Td>
      <Td label="Tình hình" className="px-4! py-3.5 align-middle whitespace-nowrap lg:border-r lg:border-line">
        {job.isOverdue ? (
          <Badge tone="danger">Quá giờ, chưa khảo sát</Badge>
        ) : (
          <Badge tone={past ? 'neutral' : status.tone}>{status.label}</Badge>
        )}
      </Td>
      <Td className="px-4! py-3.5 align-middle text-right whitespace-nowrap">
        <ButtonLink icon="visibility" to={to} size="sm" variant="info">
          Xem chi tiết
        </ButtonLink>
      </Td>
    </Tr>
  )
}

// Việc của kỹ thuật viên: lịch khách đặt trong khu vực của mình đang chờ người nhận (ai nhận trước được),
// và các lịch đã nhận, nhóm theo ngày
export function TechJobsPage() {
  const open = useOpenAppointmentsQuery()
  const mine = useMyAppointmentsQuery()
  const [picked, setPicked] = useState<Tab | null>(null)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [now] = useState(() => Date.now())
  const today = todayVn()

  const openRows = useMemo(
    () => [...(open.data ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [open.data],
  )
  const rows = mine.data
  const upcoming = useMemo(
    () => (rows ?? []).filter((r) => isActive(r, now)).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [rows, now],
  )
  const past = useMemo(
    () => (rows ?? []).filter((r) => !isActive(r, now)).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [rows, now],
  )

  const filteredOpen = useMemo(
    () => openRows.filter((j) => matchesJob(j, search, date, time)),
    [openRows, search, date, time],
  )
  const filteredUpcoming = useMemo(
    () => upcoming.filter((j) => matchesJob(j, search, date, time)),
    [upcoming, search, date, time],
  )
  const filteredPast = useMemo(() => past.filter((j) => matchesJob(j, search, date, time)), [past, search, date, time])

  const canTake = openRows.filter((r) => r.canAccept).length
  const tab: Tab = picked ?? (canTake > 0 ? 'open' : 'upcoming')
  const hasFilter = search.trim() !== '' || date !== '' || time !== ''

  const resetFilters = () => {
    setSearch('')
    setDate('')
    setTime('')
  }

  return (
    <>
      <PageHeader
        title="Việc của tôi"
        description={
          canTake > 0 ? <Badge tone="danger">{canTake} lịch trong khu vực đang chờ người nhận</Badge> : undefined
        }
        actions={
          <ButtonLink variant="info" to={ROUTES.tech.schedule} icon="calendar_month">
            Lịch làm việc
          </ButtonLink>
        }
      />
      <div className="mb-4 space-y-3">
        <TechJobFilterBar
          search={search}
          onSearchChange={setSearch}
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
          hasFilter={hasFilter}
          onReset={resetFilters}
        />
        <FilterChips
          label="Lọc lịch"
          value={tab}
          onChange={setPicked}
          chips={[
            { value: 'open', label: 'Chờ nhận', count: filteredOpen.length },
            { value: 'upcoming', label: 'Đã nhận', count: filteredUpcoming.length },
            { value: 'past', label: 'Đã qua', count: filteredPast.length },
          ]}
        />
      </div>
      {tab === 'open' ? (
        <QueryBoundary query={open}>
          {() =>
            filteredOpen.length === 0 ? (
              <EmptyState
                title={hasFilter ? 'Không tìm thấy lịch chờ nhận phù hợp' : 'Không có lịch nào đang chờ'}
                description={hasFilter ? 'Thử đổi từ khoá, ngày hoặc giờ tìm kiếm.' : undefined}
              />
            ) : (
              <JobTable
                labels={OPEN_LABELS}
                rows={filteredOpen}
                today={today}
                row={(job) => <OpenJobRow job={job} />}
              />
            )
          }
        </QueryBoundary>
      ) : (
        <QueryBoundary query={mine}>
          {() => {
            const shown = tab === 'upcoming' ? filteredUpcoming : filteredPast
            if (shown.length === 0)
              return (
                <EmptyState
                  title={
                    hasFilter
                      ? 'Không tìm thấy lịch phù hợp'
                      : tab === 'upcoming'
                        ? 'Chưa có lịch nào cần làm'
                        : 'Chưa có lịch nào đã qua'
                  }
                  description={
                    hasFilter
                      ? 'Thử đổi từ khoá, ngày hoặc giờ tìm kiếm.'
                      : tab === 'upcoming'
                        ? 'Nhận lịch ở tab "Chờ nhận" thì lịch hiện ở đây.'
                        : undefined
                  }
                />
              )
            return (
              <JobTable
                labels={MINE_LABELS}
                rows={shown}
                today={today}
                row={(job) => <MyJobRow job={job} past={tab === 'past'} />}
              />
            )
          }}
        </QueryBoundary>
      )}
    </>
  )
}
