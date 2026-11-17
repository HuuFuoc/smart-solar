import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { FilterChips } from '@/components/common/ui/chips'
import { PageHeader } from '@/components/common/ui/page-header'
import { QueryBoundary } from '@/components/common/ui/query-boundary'
import { EmptyState } from '@/components/common/ui/states'
import { Td } from '@/components/common/ui/table'
import {
  DayActionsCell,
  DayGroupedTable,
  DayGroupedTableSkeleton,
  DayRow,
  DayTimeCell,
  DayTitleCell,
  DayViewLink,
  type DayColumn,
} from '@/features/scheduling/DayGroupedTable'
import {
  assignmentSourceLabel,
  formatMoment,
  ineligibleLabel,
  technicianProgressMeta,
} from '@/features/scheduling/schedulingDisplay'
import { TechJobFilterBar } from '@/features/scheduling/TechJobFilterBar'
import { matchesJob } from '@/features/scheduling/techJobFilter'
import { siteArea } from '@/features/scheduling/siteArea'
import {
  useAcceptAppointmentMutation,
  useMyAppointmentsQuery,
  useOpenAppointmentsQuery,
} from '@/hooks/useTechnicianJobs'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'
import type { OpenAppointmentView, TechnicianAppointmentListItem } from '@/types/res/technicianAppointmentsRes'

type Tab = 'open' | 'upcoming' | 'past'

const OPEN_COLUMNS: DayColumn[] = [
  { label: 'Giờ' },
  { label: 'Công trình', primary: true },
  { label: 'Khu vực' },
  { label: 'Hạn nhận' },
]

const MINE_COLUMNS: DayColumn[] = [
  { label: 'Giờ' },
  { label: 'Công trình', primary: true },
  { label: 'Nhận việc' },
  { label: 'Tình hình' },
]

const EMPTY: Record<Tab, string> = {
  open: 'Không có lịch nào đang chờ người nhận',
  upcoming: 'Chưa có lịch nào cần làm',
  past: 'Chưa có lịch nào đã qua',
}

/** Lịch chưa kết thúc hoặc quá giờ mà chưa khảo sát */
const isActive = (a: TechnicianAppointmentListItem, now: number) => a.isOverdue || new Date(a.endsAt).getTime() >= now

function OpenJobRow({ job }: { job: OpenAppointmentView }) {
  const accept = useAcceptAppointmentMutation()
  const navigate = useNavigate()
  const to = withId(ROUTES.tech.openJob, job.appointmentId)

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
    <DayRow>
      <DayTimeCell startsAt={job.startsAt} endsAt={job.endsAt} />
      <DayTitleCell to={to} title={job.propertyName} detail={siteArea([job.ward, job.district], job.province)} />
      <Td label="Khu vực" className="whitespace-nowrap">
        {job.zone?.name ?? '—'}
      </Td>
      <Td label="Hạn nhận" className="tnum whitespace-nowrap">
        {formatMoment(job.acceptanceDeadlineAt)}
      </Td>
      <DayActionsCell>
        {job.canAccept ? (
          <Button size="sm" variant="soft" icon="task_alt" disabled={accept.isPending} onClick={() => void onAccept()}>
            {accept.isPending ? 'Đang nhận…' : 'Nhận việc'}
            <span className="sr-only"> {job.propertyName}</span>
          </Button>
        ) : (
          <span className="text-meta text-fg-2">{ineligibleLabel(job.reason) ?? 'Bận lịch khác'}</span>
        )}
        <DayViewLink to={to} name={job.propertyName} />
      </DayActionsCell>
    </DayRow>
  )
}

function MyJobRow({ job, now }: { job: TechnicianAppointmentListItem; now: number }) {
  const to = withId(ROUTES.tech.job, job.appointmentId)
  const progress = technicianProgressMeta(job, now)
  return (
    <DayRow>
      <DayTimeCell startsAt={job.startsAt} endsAt={job.endsAt} />
      <DayTitleCell
        to={to}
        title={job.propertyName}
        detail={siteArea([job.communeName ?? job.ward ?? job.district], job.province)}
      />
      <Td label="Nhận việc">
        <span className="whitespace-nowrap">{assignmentSourceLabel(job.assignmentSource, 'technician')}</span>
        {job.assignedAt && <span className="tnum block text-meta text-fg-2">{formatMoment(job.assignedAt)}</span>}
      </Td>
      <Td label="Tình hình" className="whitespace-nowrap">
        <Badge tone={progress.tone}>{progress.label}</Badge>
      </Td>
      <DayActionsCell>
        <DayViewLink to={to} name={job.propertyName} />
      </DayActionsCell>
    </DayRow>
  )
}

// Lịch khảo sát của kỹ thuật viên: chờ nhận (trong khu vực, chưa ai nhận), đã nhận (sắp tới hoặc quá giờ chưa khảo sát),
// đã qua
export function TechJobsPage() {
  const open = useOpenAppointmentsQuery()
  const mine = useMyAppointmentsQuery()
  const [picked, setPicked] = useState<Tab | null>(null)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [now] = useState(() => Date.now())

  const openRows = useMemo(
    () => (open.data ?? []).filter((j) => matchesJob(j, search, date, time)),
    [open.data, search, date, time],
  )
  const mineRows = useMemo(() => {
    const out = { upcoming: [] as TechnicianAppointmentListItem[], past: [] as TechnicianAppointmentListItem[] }
    for (const job of mine.data ?? []) {
      if (matchesJob(job, search, date, time)) out[isActive(job, now) ? 'upcoming' : 'past'].push(job)
    }
    return out
  }, [mine.data, search, date, time, now])

  const canTake = (open.data ?? []).filter((j) => j.canAccept).length
  const overdue = (mine.data ?? []).filter((j) => j.isOverdue).length
  const tab: Tab = picked ?? (canTake > 0 ? 'open' : 'upcoming')
  const hasFilter = search.trim() !== '' || date !== '' || time !== ''
  const emptyTitle = hasFilter ? 'Không tìm thấy lịch phù hợp' : EMPTY[tab]

  return (
    <>
      <PageHeader
        title="Khảo sát"
        description={
          overdue > 0 ? <Badge tone="danger">{overdue} lịch đã qua giờ hẹn mà chưa khảo sát</Badge> : undefined
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
          onReset={() => {
            setSearch('')
            setDate('')
            setTime('')
          }}
        />
        <FilterChips
          label="Lọc lịch khảo sát"
          value={tab}
          onChange={setPicked}
          chips={[
            { value: 'open', label: 'Chờ nhận', count: openRows.length },
            { value: 'upcoming', label: 'Đã nhận', count: mineRows.upcoming.length },
            { value: 'past', label: 'Đã qua', count: mineRows.past.length },
          ]}
        />
      </div>
      {tab === 'open' ? (
        <QueryBoundary query={open} fallback={<DayGroupedTableSkeleton />}>
          {() =>
            openRows.length === 0 ? (
              <EmptyState title={emptyTitle} />
            ) : (
              <DayGroupedTable
                label="Lịch chờ nhận"
                columns={OPEN_COLUMNS}
                rows={openRows}
                rowKey={(job) => job.appointmentId}
                unit="lịch"
                row={(job) => <OpenJobRow job={job} />}
              />
            )
          }
        </QueryBoundary>
      ) : (
        <QueryBoundary query={mine} fallback={<DayGroupedTableSkeleton />}>
          {() =>
            mineRows[tab].length === 0 ? (
              <EmptyState title={emptyTitle} />
            ) : (
              <DayGroupedTable
                label={tab === 'upcoming' ? 'Lịch đã nhận' : 'Lịch đã qua'}
                columns={MINE_COLUMNS}
                rows={mineRows[tab]}
                rowKey={(job) => job.appointmentId}
                unit="lịch"
                row={(job) => <MyJobRow job={job} now={now} />}
              />
            )
          }
        </QueryBoundary>
      )}
    </>
  )
}
