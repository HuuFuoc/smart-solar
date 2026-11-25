import { useMemo } from 'react'
import { ColumnChart, type CategoryRow } from '@/components/common/charts/CartesianCharts'
import { ChartPanel } from '@/components/common/charts/ChartPanel'
import { SERIES, formatCount } from '@/components/common/charts/chartTheme'
import { KpiLabel } from '@/components/common/charts/KpiLabel'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { ErrorState, Skeleton } from '@/components/common/ui/states'
import { visitPurposeLabel } from '@/features/after-sales/serviceDisplay'
import { awaitsAnswer } from '@/features/after-sales/technicianVisitDisplay'
import { ActionList, type ActionItem } from '@/features/dashboard/ActionList'
import {
  countByMonth,
  daysTouched,
  monthAxisLabel,
  monthTitle,
  monthsEndingAt,
  weekOf,
} from '@/features/dashboard/dashboardStats'
import { ProjectStatusChart } from '@/features/dashboard/ProjectStatusChart'
import { ScheduleTimeline, type TimelineItem } from '@/features/dashboard/ScheduleTimeline'
import { awaitsMyAnswer } from '@/features/installations/technicianInstallationDisplay'
import { addDays, dayChip, formatDay, formatMoment, todayVn } from '@/features/scheduling/schedulingDisplay'
import { useTechnicianSchedulesQuery } from '@/hooks/useInstallationSchedules'
import { useMyVisitsQuery } from '@/hooks/useTechnicianAfterSales'
import { useMyInstallationsQuery } from '@/hooks/useTechnicianInstallations'
import { useMyAppointmentsQuery, useOpenAppointmentsQuery } from '@/hooks/useTechnicianJobs'
import { useNow } from '@/hooks/useNow'
import { ROUTES, withId } from '@/routes/paths'

// /tech/dashboard: việc của chính kỹ thuật viên (backend chỉ trả việc giao cho người đang đăng nhập). Bốn danh sách đầu dùng lại
// truy vấn khung kỹ thuật viên đã gọi cho số đỏ trên menu; thêm danh sách hợp đồng của công trình mình khảo sát để biết lịch thi công
// nào đang chờ tải trang ký. Ưu tiên đọc trên điện thoại: một cột, việc cần làm trước, lịch 7 ngày dạng danh sách

type Kind = 'survey' | 'installation' | 'service'
type Work = { id: string; kind: Kind; title: string; startsAt: string; endsAt: string; href: string; done: boolean }

const KIND_SERIES: { key: Kind; label: string; color: string }[] = [
  { key: 'survey', label: 'Khảo sát', color: SERIES[0] },
  { key: 'installation', label: 'Lắp đặt', color: SERIES[1] },
  { key: 'service', label: 'Bảo hành, sửa chữa', color: SERIES[2] },
]
const KIND_COLOR = Object.fromEntries(KIND_SERIES.map((s) => [s.key, s.color])) as Record<Kind, string>
const KIND_LABEL = Object.fromEntries(KIND_SERIES.map((s) => [s.key, s.label])) as Record<Kind, string>

const LIVE_ASSIGNMENT = (s: string) => !['DECLINED', 'REPLACED', 'CANCELLED'].includes(s)

export function TechDashboardPage() {
  const today = useMemo(() => todayVn(), [])
  const now = useNow(60_000)
  const surveysQuery = useMyAppointmentsQuery()
  const openQuery = useOpenAppointmentsQuery()
  const installationsQuery = useMyInstallationsQuery()
  const visitsQuery = useMyVisitsQuery()
  const schedulesQuery = useTechnicianSchedulesQuery()

  const surveys = surveysQuery.data ?? []
  const installations = (installationsQuery.data ?? []).filter(
    (p) => p.status !== 'CANCELLED' && LIVE_ASSIGNMENT(p.myAssignmentStatus),
  )
  const visits = (visitsQuery.data ?? []).filter((v) => v.status !== 'DECLINED')
  const contracts = schedulesQuery.data ?? []

  // ---- số liệu
  const upcomingSurveys = surveys.filter(
    (a) => (a.status === 'ACCEPTED' || a.status === 'ASSIGNED') && new Date(a.endsAt).getTime() >= now,
  )
  const overdueSurveys = surveys.filter((a) => a.isOverdue)
  const assignedInstallations = installations.filter((p) => p.status !== 'COMPLETED')
  const working = installations.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'REWORK_REQUIRED')
  const rework = installations.filter((p) => p.status === 'REWORK_REQUIRED')
  const doneInstallations = installations.filter((p) => p.status === 'COMPLETED')
  const doneSurveys = surveys.filter((a) => a.status === 'COMPLETED')
  const doneVisits = visits.filter((v) => v.status === 'REPORTED')
  const toAccept = {
    surveys: (openQuery.data ?? []).filter((j) => j.canAccept).length,
    installations: installations.filter(awaitsMyAnswer),
    visits: visits.filter(awaitsAnswer).length,
  }
  const awaitingSignature = contracts.filter((c) => c.schedule?.awaitingContractSignature)

  // ---- việc theo ngày (bỏ việc đã huỷ, đã từ chối, đã giao người khác)
  const work: Work[] = [
      ...surveys
        .filter((a) => a.status !== 'CANCELLED')
        .map((a) => ({
          id: a.appointmentId,
          kind: 'survey' as const,
          title: a.propertyName,
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          href: withId(ROUTES.tech.job, a.appointmentId),
          done: a.status === 'COMPLETED',
        })),
      ...installations.map((p) => ({
        id: p.projectId,
        kind: 'installation' as const,
        title: p.site?.propertyName ?? 'Công trình lắp đặt',
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        href: withId(ROUTES.tech.installation, p.projectId),
        done: p.status === 'COMPLETED',
      })),
      ...visits.map((v) => ({
        id: v.visitId,
        kind: 'service' as const,
        title: `${visitPurposeLabel(v.purpose)} ${v.requestNumber}`,
        startsAt: v.startsAt,
        endsAt: v.endsAt,
        href: withId(ROUTES.tech.afterSalesVisit, v.visitId),
        done: v.status === 'REPORTED',
      })),
  ]

  const week = weekOf(today)
  const weekRows: CategoryRow[] = week.map((day) => {
    const chip = dayChip(day)
    const values = { survey: 0, installation: 0, service: 0 }
    for (const w of work) if (daysTouched(w.startsAt, w.endsAt, [day]).length > 0) values[w.kind] += 1
    return {
      key: day,
      label: chip.weekday,
      title: `${formatDay(day)}${day === today ? ', hôm nay' : ''}`,
      values,
      href: `${ROUTES.tech.schedule}?che-do=ngay&ngay=${day}`,
    }
  })
  const weekTotal = weekRows.reduce((s, r) => s + (r.values.survey ?? 0) + (r.values.installation ?? 0) + (r.values.service ?? 0), 0)

  const next7 = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const agenda: TimelineItem[] = work
    .filter((w) => !w.done && new Date(w.endsAt).getTime() >= now)
    .map((w) => ({
      key: `${w.kind}-${w.id}`,
      label: w.title,
      startsAt: w.startsAt,
      endsAt: w.endsAt,
      color: KIND_COLOR[w.kind],
      group: KIND_LABEL[w.kind],
      href: w.href,
    }))

  const months = monthsEndingAt(today.slice(0, 7), 6)
  const completedByMonth = countByMonth(doneInstallations, (p) => p.completedAt, months)
  const completedRows: CategoryRow[] = completedByMonth.map((m) => ({
    key: m.month,
    label: monthAxisLabel(m.month),
    title: monthTitle(m.month),
    values: { done: m.count },
  }))
  const completedInWindow = completedByMonth.reduce((s, m) => s + m.count, 0)

  const actions: ActionItem[] = [
    {
      key: 'accept-installation',
      label: 'Công trình chờ bạn nhận',
      hint: 'Quản lý đã giao; nhận hoặc từ chối để quản lý xếp tiếp',
      count: toAccept.installations.length,
      href: ROUTES.tech.installations,
      urgent: true,
      items: toAccept.installations.slice(0, 3).map((p) => ({
        key: p.projectId,
        label: p.site?.propertyName ?? 'Công trình lắp đặt',
        meta: formatMoment(p.startsAt),
        href: withId(ROUTES.tech.installation, p.projectId),
      })),
    },
    {
      key: 'rework',
      label: 'Công trình cần sửa lại',
      hint: 'Khách yêu cầu làm lại; cần ảnh của lượt mới',
      count: rework.length,
      href: ROUTES.tech.installations,
      urgent: true,
      items: rework.slice(0, 3).map((p) => ({
        key: p.projectId,
        label: p.site?.propertyName ?? 'Công trình lắp đặt',
        href: withId(ROUTES.tech.installation, p.projectId),
      })),
    },
    {
      key: 'overdue-survey',
      label: 'Khảo sát đã qua giờ, chưa xong',
      count: overdueSurveys.length,
      href: ROUTES.tech.jobs,
      urgent: true,
      items: overdueSurveys.slice(0, 3).map((a) => ({
        key: a.appointmentId,
        label: a.propertyName,
        meta: formatMoment(a.startsAt),
        href: withId(ROUTES.tech.job, a.appointmentId),
      })),
    },
    {
      key: 'signature',
      label: 'Hợp đồng chờ tải trang ký giấy',
      hint: 'Lịch thi công dự kiến chỉ xác nhận khi hợp đồng giấy đã đủ trang',
      count: awaitingSignature.length,
      href: ROUTES.tech.installationSchedules,
      items: awaitingSignature.slice(0, 3).map((c) => ({
        key: c.contractId,
        label: `${c.customerName}, ${c.contractNumber}`,
        meta: c.propertyName,
        href: withId(ROUTES.tech.contract, c.contractId),
      })),
    },
    {
      key: 'accept-survey',
      label: 'Lịch khảo sát trong khu vực chờ người nhận',
      count: toAccept.surveys,
      href: ROUTES.tech.jobs,
    },
    {
      key: 'accept-visit',
      label: 'Buổi hẹn bảo hành chờ bạn nhận',
      count: toAccept.visits,
      href: ROUTES.tech.afterSales,
    },
  ]
  const todoCount = actions.reduce((s, a) => s + a.count, 0)

  const core = [surveysQuery, installationsQuery, visitsQuery]
  const loading = core.some((q) => q.isPending)
  const allFailed = core.every((q) => q.isError)
  const refetch = () =>
    void Promise.allSettled([...core, openQuery, schedulesQuery].map((q) => q.refetch()))
  const refreshing = core.some((q) => q.isFetching && !q.isPending)

  if (allFailed)
    return <ErrorState title="Không tải được việc của bạn." message="Kiểm tra kết nối rồi thử lại." onRetry={refetch} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan"
        description={
          todoCount > 0 ? <Badge tone="danger">{formatCount(todoCount)} việc chờ bạn</Badge> : 'Việc được giao cho bạn.'
        }
        actions={
          <Button variant="secondary" icon="refresh" disabled={refreshing} onClick={refetch}>
            {refreshing ? 'Đang làm mới…' : 'Làm mới'}
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-24" />
      ) : (
        <StatRow framed className="md:grid-cols-3 xl:grid-cols-6">
          <Stat
            label="Lịch khảo sát sắp tới"
            value={formatCount(upcomingSurveys.length)}
            note={overdueSurveys.length > 0 ? `${formatCount(overdueSurveys.length)} đã qua giờ` : 'Đã nhận, chưa tới giờ'}
          />
          <Stat
            label="Lắp đặt được giao"
            value={formatCount(assignedInstallations.length)}
            note={
              toAccept.installations.length > 0
                ? `${formatCount(toAccept.installations.length)} chờ bạn nhận`
                : 'Chưa bàn giao'
            }
          />
          <Stat
            label="Đang thực hiện"
            value={formatCount(working.length)}
            tone={rework.length > 0 ? 'danger' : 'default'}
            note={rework.length > 0 ? `${formatCount(rework.length)} cần sửa lại` : 'Đang lắp đặt'}
          />
          <Stat
            label={<KpiLabel label="Đã hoàn thành" hint="Mọi thời điểm: lắp đặt đã bàn giao, khảo sát, bảo hành" />}
            value={formatCount(doneInstallations.length + doneSurveys.length + doneVisits.length)}
            note={`${formatCount(doneInstallations.length)} lắp đặt, ${formatCount(doneSurveys.length)} khảo sát`}
          />
          <Stat
            label="Chờ tải trang ký"
            value={formatCount(awaitingSignature.length)}
            unit="hợp đồng"
            tone={awaitingSignature.length > 0 ? 'warn' : 'default'}
          />
          <Stat
            label="Việc tuần này"
            value={formatCount(weekTotal)}
            note={`${formatDay(week[0]!)} – ${formatDay(week[6]!)}`}
          />
        </StatRow>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <ActionList
          className="lg:order-2 lg:col-span-5"
          title="Việc cần làm tiếp theo"
          actions={actions}
          loading={loading}
          emptyText="Không có việc nào đang chờ bạn."
        />
        <div className="space-y-4 lg:order-1 lg:col-span-7">
          <ChartPanel
            title="Lịch 7 ngày tới"
            scope="Của bạn"
            description="Khảo sát, lắp đặt và bảo hành chưa kết thúc; bấm một việc để mở."
            state={loading ? 'loading' : 'ready'}
          >
            <ScheduleTimeline
              items={agenda}
              days={next7}
              today={today}
              legend={KIND_SERIES}
              emptyText="Không có việc nào trong 7 ngày tới."
            />
          </ChartPanel>
          <ChartPanel
            title="Công việc theo ngày trong tuần"
            scope="Tuần này"
            description="Số việc chạm vào mỗi ngày (một việc nhiều ngày tính ở mỗi ngày). Bấm cột để mở lịch ngày đó."
            state={loading ? 'loading' : weekTotal === 0 ? 'empty' : 'ready'}
            emptyText="Tuần này chưa có việc nào."
            table={{
              caption: 'Công việc theo ngày trong tuần',
              columns: [{ label: 'Ngày' }, ...KIND_SERIES.map((s) => ({ label: s.label, numeric: true }))],
              rows: weekRows.map((r) => ({
                key: r.key,
                cells: [r.title, ...KIND_SERIES.map((s) => formatCount(r.values[s.key] ?? 0))],
              })),
            }}
          >
            <ColumnChart
              rows={weekRows}
              series={KIND_SERIES}
              height={220}
              ariaLabel="Biểu đồ cột chồng số việc mỗi ngày trong tuần theo loại việc"
            />
          </ChartPanel>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ProjectStatusChart
          title="Công trình lắp đặt của bạn"
          description="Công trình đang giao hoặc đã bàn giao cho bạn."
          projects={installations}
          listRoute={ROUTES.tech.installations}
          hrefFor={() => ROUTES.tech.installations}
          state={installationsQuery.isPending ? 'loading' : installationsQuery.isError ? 'error' : 'ready'}
          onRetry={() => void installationsQuery.refetch()}
        />
        <ChartPanel
          title="Lắp đặt đã bàn giao theo tháng"
          scope="6 tháng gần nhất"
          description="Theo ngày bàn giao (giờ Việt Nam)."
          state={
            installationsQuery.isPending ? 'loading' : installationsQuery.isError ? 'error' : completedInWindow === 0 ? 'empty' : 'ready'
          }
          emptyText="Chưa có công trình nào bàn giao trong 6 tháng gần nhất."
          onRetry={() => void installationsQuery.refetch()}
          table={{
            caption: 'Lắp đặt đã bàn giao theo tháng',
            columns: [{ label: 'Tháng' }, { label: 'Công trình', numeric: true }],
            rows: completedRows.map((r) => ({ key: r.key, cells: [r.title, formatCount(r.values.done ?? 0)] })),
          }}
        >
          <ColumnChart
            rows={completedRows}
            series={[{ key: 'done', label: 'Đã bàn giao', color: SERIES[1] }]}
            height={200}
            ariaLabel="Biểu đồ cột số công trình bàn giao mỗi tháng"
          />
        </ChartPanel>
      </div>
    </div>
  )
}

export default TechDashboardPage
