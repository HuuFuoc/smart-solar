import { useMemo } from 'react'
import { ButtonLink } from '@/components/common/ui/button'
import { PageHeader } from '@/components/common/ui/page-header'
import { Panel } from '@/components/common/ui/panel'
import { Stat, StatRow } from '@/components/common/ui/stat'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/common/ui/states'
import { Stepper, type Step } from '@/components/common/ui/stepper'
import { CUSTOMER_INSTALLATION_LABELS, INSTALLATION_STATUS_LABELS } from '@/common/installation'
import {
  CustomerProjectPanel,
  ServicesSummary,
  UpcomingAppointments,
} from '@/features/customer-dashboard/CustomerOverviewPanels'
import { CustomerTodoList } from '@/features/customer-dashboard/CustomerTodoList'
import { customerTodos } from '@/features/customer-dashboard/customerTodos'
import { isUpcomingAppointment } from '@/features/customer-dashboard/services/dashboardChartService'
import { latestPerRequest } from '@/features/quotations/quotationDisplay'
import { formatMoment } from '@/features/scheduling/schedulingDisplay'
import { useMyRequestsQuery } from '@/hooks/useBooking'
import { useSubscriptionsQuery } from '@/hooks/useCustomerAfterSales'
import { useMyContractsQuery } from '@/hooks/useCustomerContracts'
import { useMyInstallationsQuery } from '@/hooks/useCustomerInstallations'
import { useMyQuotationsQuery } from '@/hooks/useCustomerQuotations'
import { useMyServiceRequestsQuery } from '@/hooks/useCustomerServiceRequests'
import { useMyDispatchesQuery } from '@/hooks/useDispatch'
import { ROUTES } from '@/routes/paths'

// Các chặng của một công trình, theo thứ tự khách đi qua
const STAGES = [
  { id: 'ASSESSMENT', label: 'Đánh giá sơ bộ', meta: 'Khai mái nhà, xem mô phỏng' },
  { id: 'SURVEY', label: 'Khảo sát tại nhà', meta: 'Kỹ thuật viên đo đạc' },
  { id: 'QUOTATION', label: 'Báo giá, hợp đồng', meta: 'Đồng ý báo giá, ký hợp đồng' },
  { id: 'INSTALLATION', label: 'Lắp đặt', meta: 'Thi công, nghiệm thu' },
  { id: 'HANDOVER', label: 'Bàn giao, bảo hành', meta: 'Bảo hành, bảo trì' },
] as const
type StageId = (typeof STAGES)[number]['id']

const isOpenProject = (status: string) => status !== 'COMPLETED' && status !== 'CANCELLED'

// /customer/dashboard: việc đang chờ khách lên đầu, rồi số liệu, chặng hiện tại, công trình, lịch hẹn, gói dịch vụ.
// Dữ liệu lấy từ các query mà khung khách hàng đã gọi cho số trên menu, nên không thêm lời gọi API
export function CustomerDashboardPage() {
  const installationsQuery = useMyInstallationsQuery()
  const requestsQuery = useMyRequestsQuery()
  const servicesQuery = useMyServiceRequestsQuery()
  const quotationsQuery = useMyQuotationsQuery()
  const subscriptionsQuery = useSubscriptionsQuery()
  const contractsQuery = useMyContractsQuery()
  const { dispatches } = useMyDispatchesQuery(requestsQuery.data)

  const installations = useMemo(() => installationsQuery.data ?? [], [installationsQuery.data])
  const surveyRequests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data])
  const serviceRequests = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data])
  const quotations = useMemo(() => quotationsQuery.data ?? [], [quotationsQuery.data])
  const subscriptions = useMemo(() => subscriptionsQuery.data ?? [], [subscriptionsQuery.data])
  const contracts = useMemo(() => contractsQuery.data ?? [], [contractsQuery.data])

  const todos = useMemo(
    () =>
      customerTodos({
        requests: surveyRequests,
        dispatches,
        quotations: latestPerRequest(quotations),
        contracts,
        installations,
        serviceRequests,
        subscriptions,
      }),
    [surveyRequests, dispatches, quotations, contracts, installations, serviceRequests, subscriptions],
  )

  const activeProject = installations.find((p) => isOpenProject(p.status))
  const activeProjects = installations.filter((p) => isOpenProject(p.status)).length
  const completedProjects = installations.filter((p) => p.status === 'COMPLETED').length
  const openServices = serviceRequests.filter(
    (s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && s.status !== 'CLOSED_DUPLICATE',
  ).length
  const upcoming = surveyRequests
    .filter((r) => isUpcomingAppointment(r))
    .sort((a, b) => a.appointment!.startsAt.localeCompare(b.appointment!.startsAt))

  const stage: StageId =
    completedProjects > 0
      ? 'HANDOVER'
      : activeProjects > 0
        ? 'INSTALLATION'
        : quotations.length > 0 || surveyRequests.some((r) => r.status === 'COMPLETED')
          ? 'QUOTATION'
          : surveyRequests.length > 0
            ? 'SURVEY'
            : 'ASSESSMENT'
  const stageIndex = STAGES.findIndex((s) => s.id === stage)
  const steps: Step[] = STAGES.map((s, i) => ({
    label: s.label,
    meta: s.meta,
    state: i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'upcoming',
  }))

  const loading = [installationsQuery, requestsQuery, servicesQuery, quotationsQuery, subscriptionsQuery].every(
    (q) => q.isPending,
  )
  const allFailed = [installationsQuery, requestsQuery, servicesQuery].every((q) => q.isError)
  const hasAnyData =
    installations.length > 0 || surveyRequests.length > 0 || serviceRequests.length > 0 || quotations.length > 0

  if (loading) return <PageSkeleton />
  if (allFailed)
    return (
      <ErrorState
        title="Không tải được trang tổng quan."
        onRetry={() => {
          void installationsQuery.refetch()
          void requestsQuery.refetch()
          void servicesQuery.refetch()
          void quotationsQuery.refetch()
          void subscriptionsQuery.refetch()
        }}
      />
    )

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description={todos.length > 0 ? `${todos.length} việc đang chờ bạn.` : 'Không có việc nào đang chờ bạn.'}
        actions={
          <>
            <ButtonLink to={ROUTES.customer.assessment} variant="primary" icon="roofing">
              Đánh giá sơ bộ mới
            </ButtonLink>
            <ButtonLink to={ROUTES.customer.requests} variant="soft" icon="calendar_month">
              Đặt giờ khảo sát
            </ButtonLink>
            <ButtonLink to={ROUTES.customer.afterSales} variant="danger" icon="report">
              Báo lỗi
            </ButtonLink>
          </>
        }
      />

      {!hasAnyData ? (
        <EmptyState
          title="Bắt đầu với đánh giá sơ bộ"
          description="Khai thông tin mái nhà để xem ước tính số tấm pin và sản lượng, rồi chọn giờ để kỹ thuật viên đến khảo sát."
          action={
            <ButtonLink to={ROUTES.customer.products} variant="secondary" icon="solar_power">
              Xem sản phẩm
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-6">
          {todos.length > 0 && (
            <Panel raised aria-labelledby="todo-title">
              <h2 id="todo-title" className="mb-3 text-title font-semibold">
                Việc cần làm
              </h2>
              <CustomerTodoList items={todos} />
            </Panel>
          )}

          <StatRow framed>
            <Stat
              label="Công trình đang lắp đặt"
              value={activeProjects}
              note={
                activeProject
                  ? (CUSTOMER_INSTALLATION_LABELS[activeProject.status] ??
                    INSTALLATION_STATUS_LABELS[activeProject.status] ??
                    activeProject.status)
                  : undefined
              }
            />
            <Stat
              label="Lịch hẹn sắp tới"
              value={upcoming.length}
              note={upcoming[0]?.appointment ? formatMoment(upcoming[0].appointment.startsAt) : undefined}
            />
            <Stat label="Hệ thống đã bàn giao" value={completedProjects} />
            <Stat label="Yêu cầu bảo hành đang mở" value={openServices} />
          </StatRow>

          <section aria-labelledby="stage-title">
            <h2 id="stage-title" className="mb-3 text-title font-semibold">
              Tiến trình
            </h2>
            <Stepper steps={steps} />
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CustomerProjectPanel installations={installations} surveyRequests={surveyRequests} />
            </div>
            <div className="space-y-6 rounded-container bg-surface-2 p-4">
              <UpcomingAppointments requests={surveyRequests} />
              <div className="border-t border-line pt-4">
                <ServicesSummary subscriptions={subscriptions} serviceRequests={serviceRequests} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
