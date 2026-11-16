import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Icon } from '@/components/common/stitch-ui/Icon'
import { Button, IconButton } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { Segmented } from '@/components/common/ui/segmented'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { visitPurposeLabel } from '@/features/after-sales/serviceDisplay'
import { technicianVisitMeta } from '@/features/after-sales/technicianVisitDisplay'
import { technicianStatusMeta } from '@/features/installations/technicianInstallationDisplay'
import { DayWorkDialog } from '@/features/scheduling/DayWorkDialog'
import { DayNav, ScheduleDay } from '@/features/scheduling/ScheduleDay'
import {
  addDays,
  formatDay,
  formatJobCode,
  formatTime,
  technicianProgressMeta,
  todayVn,
} from '@/features/scheduling/schedulingDisplay'
import { siteArea } from '@/features/scheduling/siteArea'
import { WeekdayBadge } from '@/features/scheduling/WeekdayBadge'
import { WorkCalendarGrid } from '@/features/scheduling/WorkCalendarGrid'
import {
  addMonths,
  entriesByDay,
  monthEnd,
  monthGrid,
  monthStart,
  startingBetween,
  weekDays,
  weekStart,
  type WorkItem,
  type WorkKind,
} from '@/features/scheduling/workCalendar'
import { useMyAppointmentsQuery, useMyScheduleQuery } from '@/hooks/useTechnicianJobs'
import { useMyInstallationsQuery } from '@/hooks/useTechnicianInstallations'
import { useMyVisitsQuery } from '@/hooks/useTechnicianAfterSales'
import { ROUTES, withId } from '@/routes/paths'
import { errorMessage } from '@/services/api/errors'

type Mode = 'ngay' | 'tuan' | 'thang'

/** Chế độ xem và ngày neo lưu trên URL (?che-do=tuan&ngay=YYYY-MM-DD) */
const MODE_PARAM = 'che-do'
const DATE_PARAM = 'ngay'
const isDate = (v: string | null): v is string => v != null && /^\d{4}-\d{2}-\d{2}$/.test(v)

const KINDS: { kind: WorkKind; label: string; unit: string; dot: string }[] = [
  { kind: 'survey', label: 'Khảo sát', unit: 'địa điểm', dot: 'bg-info' },
  { kind: 'installation', label: 'Lắp đặt', unit: 'hệ thống', dot: 'bg-ok' },
  { kind: 'service', label: 'Bảo hành & Sửa chữa', unit: 'buổi hẹn', dot: 'bg-warn' },
]

function monthName(date: string) {
  return `Tháng ${Number(date.slice(5, 7))}, ${date.slice(0, 4)}`
}

const shortDay = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`

/** Gom việc của ba nghiệp vụ thành một danh sách; bỏ việc đã huỷ, đã từ chối hoặc giao người khác */
function useWorkItems() {
  const surveys = useMyAppointmentsQuery()
  const installations = useMyInstallationsQuery()
  const visits = useMyVisitsQuery()
  const queries = [surveys, installations, visits]

  const items = useMemo<WorkItem[]>(() => {
    const list: WorkItem[] = []
    for (const a of surveys.data ?? []) {
      if (a.status === 'CANCELLED') continue
      list.push({
        id: a.appointmentId,
        kind: 'survey',
        title: a.propertyName,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        to: withId(ROUTES.tech.job, a.appointmentId),
        done: a.status === 'COMPLETED',
        code: formatJobCode(a.appointmentId, a.startsAt),
        address: siteArea([a.communeName ?? a.ward ?? a.district], a.province),
        note: null,
        phone: null,
        statusLabel: technicianProgressMeta(a).label,
        statusTone: technicianProgressMeta(a).tone,
        actionLabel: 'Xem chi tiết khảo sát',
      })
    }
    for (const p of installations.data ?? []) {
      if (p.status === 'CANCELLED' || ['DECLINED', 'REPLACED', 'CANCELLED'].includes(p.myAssignmentStatus)) continue
      list.push({
        id: p.projectId,
        kind: 'installation',
        title: p.site?.propertyName ?? 'Công trình lắp đặt',
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        to: withId(ROUTES.tech.installation, p.projectId),
        done: p.status === 'COMPLETED',
        code: null,
        address: p.site ? siteArea([p.site.streetLine, p.site.ward, p.site.district], p.site.province) : null,
        note: null,
        phone: p.site?.customerPhone ?? null,
        statusLabel: technicianStatusMeta(p).label,
        statusTone: technicianStatusMeta(p).tone,
        actionLabel: 'Xem chi tiết lắp đặt',
      })
    }
    for (const v of visits.data ?? []) {
      if (v.status === 'DECLINED') continue
      list.push({
        id: v.visitId,
        kind: 'service',
        title: `${visitPurposeLabel(v.purpose)} ${v.requestNumber}`,
        startsAt: v.startsAt,
        endsAt: v.endsAt,
        to: withId(ROUTES.tech.afterSalesVisit, v.visitId),
        done: v.status === 'REPORTED',
        code: null,
        address: v.siteAddress,
        note: v.description || null,
        phone: null,
        statusLabel: technicianVisitMeta(v).label,
        statusTone: technicianVisitMeta(v).tone,
        actionLabel: 'Xem chi tiết buổi hẹn',
      })
    }
    return list
  }, [surveys.data, installations.data, visits.data])

  return {
    items,
    pending: queries.some((q) => q.isPending),
    error: queries.find((q) => q.isError)?.error ?? null,
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
  }
}

function StatTile({ label, count, unit, dot }: { label: string; count: number; unit: string; dot?: string }) {
  return (
    <div className="sv-card sv-compact">
      <p className="flex items-center gap-2 text-body text-fg-2">
        {dot && <span className={`size-2 rounded-full ${dot}`} aria-hidden />}
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="tnum text-figure font-bold text-fg">{count}</span>
        <span className="text-body text-fg-2">{unit}</span>
      </p>
    </div>
  )
}

/** Lắp đặt và bảo hành của một ngày; khảo sát đã có trong ScheduleDay (kèm cảnh báo trùng giờ) */
function OtherWorkOfDay({ items }: { items: WorkItem[] }) {
  if (items.length === 0) return null
  return (
    <section aria-label="Lắp đặt, bảo hành trong ngày" className="mt-6 space-y-3">
      <h2 className="text-title font-semibold text-fg">Lắp đặt, bảo hành trong ngày</h2>
      <ol className="space-y-3">
        {items.map((item) => (
          <li
            key={`${item.kind}-${item.id}`}
            className="sv-card sv-compact flex flex-wrap items-center justify-between gap-3"
          >
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="sv-cal-chip w-auto" data-kind={item.kind} data-done={item.done}>
                  {KINDS.find((k) => k.kind === item.kind)?.label}
                </span>
                <span className="text-body font-semibold text-fg">{item.title}</span>
              </p>
              <p className="tnum text-meta text-fg-2">
                {formatTime(item.startsAt)} đến {formatTime(item.endsAt)}
              </p>
            </div>
            <Link className="ui-link text-body" to={item.to}>
              Xem chi tiết<span className="sr-only"> {item.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

function DayView({ date, items }: { date: string; items: WorkItem[] }) {
  const query = useMyScheduleQuery(date)
  const others = entriesByDay(items.filter((i) => i.kind !== 'survey')).get(date) ?? []
  return (
    <>
      <ScheduleDay date={date} query={query} viewer="technician" linkFor={(id) => withId(ROUTES.tech.job, id)} />
      <OtherWorkOfDay items={others.map((e) => e.item)} />
    </>
  )
}

export function TechSchedulePage() {
  const [params, setParams] = useSearchParams()
  const rawDate = params.get(DATE_PARAM)
  const rawMode = params.get(MODE_PARAM)
  const date = isDate(rawDate) ? rawDate : todayVn()
  // Địa chỉ cũ chỉ có ?ngay= là lịch một ngày
  const mode: Mode =
    rawMode === 'ngay' || rawMode === 'tuan' || rawMode === 'thang' ? rawMode : isDate(rawDate) ? 'ngay' : 'thang'
  const go = (next: Mode, day: string) => setParams({ [MODE_PARAM]: next, [DATE_PARAM]: day })

  const work = useWorkItems()
  const [openDay, setOpenDay] = useState<string | null>(null)
  const today = todayVn()

  const from = mode === 'thang' ? monthStart(date) : mode === 'tuan' ? weekStart(date) : date
  const to = mode === 'thang' ? monthEnd(date) : mode === 'tuan' ? addDays(weekStart(date), 6) : date
  const { items } = work
  const inPeriod = startingBetween(items, from, to)
  const entries = entriesByDay(items)
  const periodLabel = mode === 'thang' ? monthName(date) : mode === 'tuan' ? 'Tuần này' : formatDay(date)

  const step = (direction: 1 | -1) =>
    go(mode, mode === 'thang' ? addMonths(date, direction) : addDays(date, direction * (mode === 'tuan' ? 7 : 1)))

  return (
    <div className="sv-list">
      <PageHeader
        title="Lịch làm việc"
        description={
          mode === 'ngay' ? (
            <span className="flex items-center gap-2">
              <WeekdayBadge date={date} format="name" withBar />
              <span>{formatDay(date, { year: true })}</span>
            </span>
          ) : (
            'Lịch hẹn khảo sát, lắp đặt, bảo hành và sửa chữa của bạn.'
          )
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Segmented<Mode>
              label="Chế độ xem lịch"
              value={mode}
              onChange={(next) => go(next, date)}
              options={[
                { value: 'ngay', label: 'Ngày' },
                { value: 'tuan', label: 'Tuần' },
                { value: 'thang', label: 'Tháng' },
              ]}
            />
            {mode === 'ngay' ? (
              <DayNav date={date} onChange={(next) => go('ngay', next)} />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <IconButton
                  icon="chevron_left"
                  label={mode === 'thang' ? 'Tháng trước' : 'Tuần trước'}
                  variant="secondary"
                  onClick={() => step(-1)}
                />
                <span className="min-w-36 text-center text-body font-semibold text-fg" aria-live="polite">
                  {mode === 'thang'
                    ? monthName(date)
                    : `${shortDay(weekStart(date))} - ${shortDay(to)}/${to.slice(0, 4)}`}
                </span>
                <IconButton
                  icon="chevron_right"
                  label={mode === 'thang' ? 'Tháng sau' : 'Tuần sau'}
                  variant="secondary"
                  onClick={() => step(1)}
                />
                <Button
                  icon="today"
                  disabled={
                    mode === 'thang' ? monthStart(date) === monthStart(today) : weekStart(date) === weekStart(today)
                  }
                  onClick={() => go(mode, today)}
                >
                  Hôm nay
                </Button>
              </div>
            )}
          </div>
        }
      />

      {!work.pending && !work.error && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={`Tổng việc ${periodLabel === 'Tuần này' ? 'tuần này' : periodLabel.replace(/, \d{4}$/, '').toLowerCase()}`}
            count={inPeriod.length}
            unit="công việc"
          />
          {KINDS.map((k) => (
            <StatTile
              key={k.kind}
              label={k.label}
              count={inPeriod.filter((i) => i.kind === k.kind).length}
              unit={k.unit}
              dot={k.dot}
            />
          ))}
        </div>
      )}

      {work.error ? (
        <ErrorState
          title="Không tải được lịch làm việc."
          message={errorMessage(work.error)}
          onRetry={() => void work.refetch()}
        />
      ) : work.pending ? (
        <div aria-label="Đang tải lịch" aria-busy="true" className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-96" />
        </div>
      ) : mode === 'ngay' ? (
        <DayView date={date} items={work.items} />
      ) : (
        <>
          <WorkCalendarGrid
            days={mode === 'thang' ? monthGrid(date) : weekDays(date)}
            entries={entries}
            month={mode === 'thang' ? date.slice(0, 7) : undefined}
            expanded={mode === 'tuan'}
            onOpenDay={setOpenDay}
          />
          <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-meta text-fg-2">
            {KINDS.map((k) => (
              <span key={k.kind} className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${k.dot}`} aria-hidden />
                {k.label}
              </span>
            ))}
            <span className="flex items-center gap-2">
              <Icon name="info" className="text-[16px] text-fg-3" />
              Bấm vào một việc để xem chi tiết ngày đó
            </span>
          </p>
        </>
      )}
      <DayWorkDialog
        day={openDay}
        entries={openDay ? (entries.get(openDay) ?? []) : []}
        onClose={() => setOpenDay(null)}
        onOpenDayPage={(day) => {
          setOpenDay(null)
          go('ngay', day)
        }}
      />
    </div>
  )
}
