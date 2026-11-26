import { useMemo } from 'react'
import { BarList, type BarListItem } from '@/components/common/charts/BarList'
import { ChartPanel } from '@/components/common/charts/ChartPanel'
import { SERIES, STATUS_COLOR, formatCount, formatVndCompact } from '@/components/common/charts/chartTheme'
import { KpiLabel } from '@/components/common/charts/KpiLabel'
import { Badge } from '@/components/common/ui/badge'
import { Button } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { Skeleton } from '@/components/common/ui/states'
import { INSTALLATION_SCHEDULE_STATUSES } from '@/common/installationSchedule'
import { isTodo } from '@/features/after-sales/serviceDisplay'
import { ActionList, type ActionItem } from '@/features/dashboard/ActionList'
import { daysTouched, foldTail } from '@/features/dashboard/dashboardStats'
import { isOpenProject } from '@/features/dashboard/projectGroups'
import { ProjectStatusChart } from '@/features/dashboard/ProjectStatusChart'
import { ScheduleTimeline, type TimelineItem } from '@/features/dashboard/ScheduleTimeline'
import { addDays, formatDateVn, todayVn } from '@/features/scheduling/schedulingDisplay'
import { useCollectionsQuery } from '@/hooks/useCollections'
import { useDispatchQueueQuery } from '@/hooks/useDispatch'
import { useStaffInstallationSchedulesQuery } from '@/hooks/useInstallationSchedules'
import { useServiceRequestsQuery } from '@/hooks/useManagerAfterSales'
import { useInstallationProjectsQuery, useReadyContractsQuery } from '@/hooks/useManagerInstallations'
import { usePendingCashCount } from '@/hooks/usePaymentDesk'
import { ROUTES, withId } from '@/routes/paths'

// /manage/dashboard: tình hình thi công và việc của quản lý. Gần như mọi số dùng lại truy vấn khung quản lý đã gọi cho số đỏ trên
// menu (dự án, hợp đồng chờ tạo dự án, điều phối, bảo hành, tiền mặt chờ xác nhận, lịch phải hẹn lại), nên chỉ thêm lịch thi công
// và hai hàng hồ sơ công nợ đã chuyển lên quản lý. Mọi số là "hiện tại", không theo kỳ

const TIMELINE_DAYS = 14
/** Dự án đang giữ kỹ thuật viên (đã phân công, chưa bàn giao) */
const WORKLOAD_STATUSES = new Set([
  'PENDING_TECHNICIAN_ACCEPTANCE',
  'SCHEDULED',
  'IN_PROGRESS',
  'PENDING_CUSTOMER_ACCEPTANCE',
  'REWORK_REQUIRED',
])

const SCHEDULE_COLORS: Record<string, string> = {
  CONFIRMED: SERIES[0],
  PLANNED: SERIES[1],
  RESCHEDULE_REQUIRED: STATUS_COLOR.danger,
}

export function ManageDashboardPage() {
  const today = useMemo(() => todayVn(), [])
  const projectsQuery = useInstallationProjectsQuery()
  const readyQuery = useReadyContractsQuery()
  const dispatchQuery = useDispatchQueueQuery()
  const requestsQuery = useServiceRequestsQuery()
  const pendingCashQuery = usePendingCashCount()
  const rescheduleQuery = useStaffInstallationSchedulesQuery('RESCHEDULE_REQUIRED')
  const schedulesQuery = useStaffInstallationSchedulesQuery(null)
  const escalatedQuery = useCollectionsQuery({ status: 'ESCALATED_TO_MANAGER', openOnly: true, page: 1, pageSize: 5 })
  const legalQuery = useCollectionsQuery({ status: 'LEGAL_REVIEW_REQUIRED', openOnly: true, page: 1, pageSize: 5 })

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])
  const open = projects.filter((p) => isOpenProject(p.status))
  const count = (status: string) => projects.filter((p) => p.status === status).length
  const inProgress = count('IN_PROGRESS')
  const awaitingAcceptance = count('PENDING_CUSTOMER_ACCEPTANCE')
  const rework = projects.filter((p) => p.status === 'REWORK_REQUIRED')
  const pendingAssignment = count('PENDING_ASSIGNMENT')
  const ready = readyQuery.data?.length ?? 0
  const openDispatch = (dispatchQuery.data?.items ?? []).filter((d) => d.status === 'OPEN').length
  const serviceTodo = (requestsQuery.data ?? []).filter((r) => isTodo(r.status, 'manager')).length
  const pendingCash = pendingCashQuery.data ?? 0
  const reschedule = rescheduleQuery.data ?? []
  const escalated = [...(escalatedQuery.data?.items ?? []), ...(legalQuery.data?.items ?? [])]
  const escalatedTotal = (escalatedQuery.data?.totalItems ?? 0) + (legalQuery.data?.totalItems ?? 0)

  const managerTodo =
    pendingCash +
    rework.length +
    escalatedTotal +
    reschedule.length +
    ready +
    pendingAssignment +
    openDispatch +
    serviceTodo

  const loadingCore = projectsQuery.isPending

  // ---- khối lượng theo kỹ thuật viên
  const workload = useMemo(() => {
    const map = new Map<string, { name: string; total: number; inProgress: number; rework: number }>()
    for (const p of projects) {
      if (!WORKLOAD_STATUSES.has(p.status) || !p.responsibleTechnicianUserId) continue
      const w = map.get(p.responsibleTechnicianUserId) ?? {
        name: p.responsibleTechnicianName ?? 'Không rõ tên',
        total: 0,
        inProgress: 0,
        rework: 0,
      }
      w.total += 1
      if (p.status === 'IN_PROGRESS') w.inProgress += 1
      if (p.status === 'REWORK_REQUIRED') w.rework += 1
      map.set(p.responsibleTechnicianUserId, w)
    }
    const items: BarListItem[] = [...map.entries()].map(([id, w]) => ({
      key: id,
      label: w.name,
      value: w.total,
      color: w.rework > 0 ? STATUS_COLOR.danger : SERIES[0],
      note:
        [w.inProgress > 0 && `${w.inProgress} đang lắp`, w.rework > 0 && `${w.rework} sửa lại`]
          .filter(Boolean)
          .join(', ') || undefined,
      href: withId(ROUTES.manage.technician, id),
    }))
    return foldTail(
      items.sort((a, b) => b.value - a.value),
      8,
      (value, folded) => ({
        key: 'other',
        label: `Khác (${folded.length} kỹ thuật viên)`,
        value,
        color: STATUS_COLOR.neutral,
        note: undefined,
        href: ROUTES.manage.technicians,
      }),
    )
  }, [projects])

  // ---- lịch thi công 14 ngày tới
  const days = useMemo(() => Array.from({ length: TIMELINE_DAYS }, (_, i) => addDays(today, i)), [today])
  const timeline: TimelineItem[] = (schedulesQuery.data ?? [])
    .filter((s) => s.status in SCHEDULE_COLORS)
    .map((s) => ({
      key: s.scheduleId,
      label: s.propertyName,
      sublabel: `${s.technicianName}, ${s.contractNumber}`,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      color: SCHEDULE_COLORS[s.status]!,
      group: INSTALLATION_SCHEDULE_STATUSES[s.status]?.staff ?? s.status,
      href: withId(ROUTES.manage.contract, s.contractId),
    }))

  const actions: ActionItem[] = [
    {
      key: 'cash',
      label: 'Tiền mặt chờ xác nhận',
      hint: 'Khách đã chọn trả tiền mặt; xác nhận khi đã nhận tiền',
      count: pendingCash,
      href: ROUTES.manage.payments,
      urgent: true,
    },
    {
      key: 'rework',
      label: 'Dự án cần sửa lại',
      hint: 'Khách yêu cầu làm lại sau khi kỹ thuật viên báo hoàn thành',
      count: rework.length,
      href: `${ROUTES.manage.installations}?trang-thai=REWORK_REQUIRED`,
      urgent: true,
      items: rework.slice(0, 3).map((p) => ({
        key: p.projectId,
        label: p.responsibleTechnicianName ? `Kỹ thuật viên ${p.responsibleTechnicianName}` : 'Chưa có kỹ thuật viên',
        href: withId(ROUTES.manage.installation, p.projectId),
      })),
    },
    {
      key: 'escalated',
      label: 'Công nợ chuyển lên quản lý',
      hint: 'Kinh doanh đã chuyển hoặc đang chờ xem xét pháp lý',
      count: escalatedTotal,
      href: `${ROUTES.manage.collections}?trang-thai=ESCALATED_TO_MANAGER`,
      urgent: true,
      items: escalated.slice(0, 3).map((c) => ({
        key: c.caseId,
        label: `${c.customerName}, ${c.contractNumber}`,
        meta: `${formatVndCompact(c.amountDue)}, ${c.daysOverdue} ngày`,
        href: withId(ROUTES.manage.collection, c.caseId),
      })),
    },
    {
      key: 'reschedule',
      label: 'Lịch thi công phải hẹn lại',
      hint: 'Ảnh hưởng tiến độ: kỹ thuật viên bận, đổi khu vực hoặc lịch không hợp lệ',
      count: reschedule.length,
      href: `${ROUTES.manage.installationSchedules}?trang-thai=RESCHEDULE_REQUIRED`,
      urgent: true,
      items: reschedule.slice(0, 3).map((s) => ({
        key: s.scheduleId,
        label: `${s.propertyName}, ${s.technicianName}`,
        meta: formatDateVn(s.startsAt),
        href: withId(ROUTES.manage.contract, s.contractId),
      })),
    },
    {
      key: 'ready',
      label: 'Hợp đồng chờ tạo dự án thi công',
      count: ready,
      href: `${ROUTES.manage.installations}?muc=hop-dong`,
    },
    {
      key: 'assign',
      label: 'Dự án chờ xếp kỹ thuật viên',
      count: pendingAssignment,
      href: `${ROUTES.manage.installations}?trang-thai=PENDING_ASSIGNMENT`,
    },
    {
      key: 'dispatch',
      label: 'Yêu cầu khảo sát chờ điều phối',
      count: openDispatch,
      href: ROUTES.manage.dispatch,
    },
    {
      key: 'service',
      label: 'Bảo hành, sửa chữa chờ quản lý',
      count: serviceTodo,
      href: ROUTES.manage.afterSales,
    },
  ]

  const refresh = () =>
    void Promise.allSettled([
      projectsQuery.refetch(),
      readyQuery.refetch(),
      dispatchQuery.refetch(),
      requestsQuery.refetch(),
      pendingCashQuery.refetch(),
      rescheduleQuery.refetch(),
      schedulesQuery.refetch(),
      escalatedQuery.refetch(),
      legalQuery.refetch(),
    ])
  const refreshing = [projectsQuery, schedulesQuery, escalatedQuery].some((q) => q.isFetching && !q.isPending)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan"
        description={
          managerTodo > 0 ? (
            <Badge tone="danger">{formatCount(managerTodo)} việc đang chờ quản lý</Badge>
          ) : (
            'Tình hình thi công và việc cần xử lý, tính tại lúc tải.'
          )
        }
        actions={
          <Button variant="secondary" icon="refresh" disabled={refreshing} onClick={refresh}>
            {refreshing ? 'Đang làm mới…' : 'Làm mới'}
          </Button>
        }
      />

      {loadingCore ? (
        <Skeleton className="h-24" />
      ) : (
        <StatRow framed className="md:grid-cols-3 xl:grid-cols-6">
          <Stat
            label={<KpiLabel label="Dự án đang quản lý" hint="Mọi dự án chưa bàn giao và chưa huỷ" />}
            value={formatCount(open.length)}
            note={`${formatCount(projects.length)} dự án tất cả`}
          />
          <Stat
            label="Đang lắp đặt"
            value={formatCount(inProgress)}
            note={`${formatCount(count('SCHEDULED'))} đã lên lịch`}
          />
          <Stat label="Chờ khách nghiệm thu" value={formatCount(awaitingAcceptance)} note="Việc của khách" />
          <Stat
            label="Cần sửa lại"
            value={formatCount(rework.length)}
            tone={rework.length > 0 ? 'danger' : 'default'}
            note="Khách yêu cầu làm lại"
          />
          <Stat
            label={<KpiLabel label="Việc chờ quản lý" hint="Tổng các dòng trong Việc cần xử lý" />}
            value={formatCount(managerTodo)}
            tone={managerTodo > 0 ? 'warn' : 'default'}
          />
          <Stat
            label="Tiền mặt chờ xác nhận"
            value={formatCount(pendingCash)}
            unit="lần"
            tone={pendingCash > 0 ? 'danger' : 'default'}
            note="Chưa phải tiền đã nhận"
          />
        </StatRow>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <ProjectStatusChart
            projects={projects}
            listRoute={ROUTES.manage.installations}
            state={projectsQuery.isPending ? 'loading' : projectsQuery.isError ? 'error' : 'ready'}
            onRetry={() => void projectsQuery.refetch()}
          />
          <ChartPanel
            title="Khối lượng theo kỹ thuật viên"
            scope="Hiện tại"
            description="Dự án đang giao cho từng người (đã phân công, chưa bàn giao). Đỏ: có dự án cần sửa lại."
            state={
              projectsQuery.isPending
                ? 'loading'
                : projectsQuery.isError
                  ? 'error'
                  : workload.length === 0
                    ? 'empty'
                    : 'ready'
            }
            emptyText="Chưa có dự án nào đang giao cho kỹ thuật viên."
            onRetry={() => void projectsQuery.refetch()}
            table={{
              caption: 'Khối lượng theo kỹ thuật viên',
              columns: [{ label: 'Kỹ thuật viên' }, { label: 'Dự án', numeric: true }, { label: 'Ghi chú' }],
              rows: workload.map((w) => ({ key: w.key, cells: [w.label, formatCount(w.value), w.note ?? ''] })),
            }}
          >
            <BarList items={workload} ariaLabel="Số dự án đang giao theo kỹ thuật viên" />
          </ChartPanel>
        </div>
        <ActionList
          className="lg:col-span-5"
          actions={actions}
          loading={loadingCore}
          emptyText="Không có việc nào đang chờ quản lý."
        />
      </div>

      <ChartPanel
        title="Lịch thi công 14 ngày tới"
        scope="Hiện tại"
        description="Lịch kỹ thuật viên đã thống nhất với khách; bấm một dòng để mở hợp đồng."
        state={schedulesQuery.isPending ? 'loading' : schedulesQuery.isError ? 'error' : 'ready'}
        onRetry={() => void schedulesQuery.refetch()}
        table={{
          caption: 'Lịch thi công 14 ngày tới',
          columns: [{ label: 'Công trình' }, { label: 'Kỹ thuật viên' }, { label: 'Bắt đầu' }, { label: 'Trạng thái' }],
          rows: timeline
            .filter((t) => daysTouched(t.startsAt, t.endsAt, days).length > 0)
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
            .map((t) => ({ key: t.key, cells: [t.label, t.sublabel ?? '', formatDateVn(t.startsAt), t.group] })),
        }}
      >
        <ScheduleTimeline
          items={timeline}
          days={days}
          today={today}
          legend={Object.entries(SCHEDULE_COLORS).map(([status, color]) => ({
            label: INSTALLATION_SCHEDULE_STATUSES[status]?.staff ?? status,
            color,
          }))}
          emptyText="Không có lịch thi công trong 14 ngày tới."
        />
      </ChartPanel>
    </div>
  )
}

export default ManageDashboardPage
