import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ScopeTag } from '@/components/common/charts/ChartPanel'
import { AdminFinanceSection } from '@/features/admin-dashboard/AdminFinanceSection'
import { AdminActionAlertsCard } from '@/features/admin-dashboard/components/AdminActionAlertsCard'
import { AdminDashboardHeader } from '@/features/admin-dashboard/components/AdminDashboardHeader'
import { AdminDashboardStats } from '@/features/admin-dashboard/components/AdminDashboardStats'
import { AdminRecentOperationsTable } from '@/features/admin-dashboard/components/AdminRecentOperationsTable'
import { installationWarrantyGap } from '@/features/after-sales/adminAfterSalesRules'
import { PeriodFilter } from '@/features/dashboard/PeriodFilter'
import { ProjectStatusChart } from '@/features/dashboard/ProjectStatusChart'
import { financePeriodError, monthOf } from '@/features/payment-plan/paymentPlanRules'
import { todayVn } from '@/features/scheduling/schedulingDisplay'
import { useWarrantyOptionsQuery } from '@/hooks/useAdminAfterSales'
import { adminFinanceKeys } from '@/hooks/useAdminFinance'
import { useAdminUsersQuery } from '@/hooks/useAdminUsers'
import { useDispatchQueueQuery } from '@/hooks/useDispatch'
import { useInstallationProjectsQuery, useReadyContractsQuery } from '@/hooks/useManagerInstallations'
import { useServiceRequestsQuery } from '@/hooks/useManagerAfterSales'
import { useProductsQuery } from '@/hooks/useProducts'
import { useOperationalZonesQuery, useTechniciansQuery } from '@/hooks/useTechnicianAdmin'
import { ROUTES } from '@/routes/paths'

// /admin/dashboard. Thứ tự: tài chính hợp đồng (ô số hiện tại, ô số trong kỳ, xu hướng, phân tích) → vận hành (hiện tại) → việc cần
// xử lý. Kỳ và khu vực nằm trên địa chỉ trang (?tu=&den=&khu=) như trang Báo cáo; chỉ áp cho khối tài chính, vì các danh sách
// vận hành của backend không lọc theo kỳ / khu vực (ghi rõ "Hiện tại" trên từng khối)
export function AdminDashboardPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useSearchParams()
  const today = useMemo(() => todayVn(), [])
  const defaults = useMemo(() => monthOf(today), [today])
  const from = search.get('tu') ?? defaults.from
  const to = search.get('den') ?? defaults.to
  const zoneId = search.get('khu') || undefined
  const periodError = financePeriodError(from, to)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const readyContractsQuery = useReadyContractsQuery()
  const projectsQuery = useInstallationProjectsQuery()
  const dispatchQueueQuery = useDispatchQueueQuery()
  const serviceRequestsQuery = useServiceRequestsQuery()
  const techniciansQuery = useTechniciansQuery()
  const zonesQuery = useOperationalZonesQuery()
  const adminUsersQuery = useAdminUsersQuery({ page: 1, pageSize: 1 })
  const productsQuery = useProductsQuery({ PageSize: 1 })
  const warrantyOptionsQuery = useWarrantyOptionsQuery()

  const setParams = (change: Record<string, string | undefined>) =>
    setSearch(
      (prev) => {
        const p = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(change)) {
          if (value) p.set(key, value)
          else p.delete(key)
        }
        return p
      },
      { replace: true },
    )

  const handleRefreshAll = async () => {
    setIsRefreshing(true)
    try {
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: adminFinanceKeys.all }),
        readyContractsQuery.refetch(),
        projectsQuery.refetch(),
        dispatchQueueQuery.refetch(),
        serviceRequestsQuery.refetch(),
        techniciansQuery.refetch(),
        zonesQuery.refetch(),
        adminUsersQuery.refetch(),
        productsQuery.refetch(),
        warrantyOptionsQuery.refetch(),
      ])
    } finally {
      setIsRefreshing(false)
    }
  }

  const isLoading =
    readyContractsQuery.isLoading ||
    projectsQuery.isLoading ||
    dispatchQueueQuery.isLoading ||
    serviceRequestsQuery.isLoading ||
    techniciansQuery.isLoading

  const readyContracts = readyContractsQuery.data ?? []
  const projects = projectsQuery.data ?? []
  const dispatchItems = dispatchQueueQuery.data?.items ?? []
  const serviceRequests = serviceRequestsQuery.data ?? []
  const technicians = techniciansQuery.data ?? []
  const zones = zonesQuery.data ?? []
  const totalUsers = adminUsersQuery.data?.totalItems ?? 0
  const totalProducts = productsQuery.data?.totalItems ?? 0
  const warrantyOptions = warrantyOptionsQuery.data ?? []

  const inProgressProjects = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'SCHEDULED').length
  const readyContractsCount = readyContracts.length
  const openDispatchCount = dispatchItems.filter((d) => d.status === 'OPEN' || d.status === 'PROPOSAL_PENDING').length
  const pendingServicesCount = serviceRequests.filter(
    (s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED',
  ).length
  const urgentServicesCount = serviceRequests.filter(
    (s) => s.status === 'AWAITING_DECISION' || s.status === 'DISPUTED',
  ).length
  const readyTechnicians = technicians.filter((t) => t.readyForScheduling).length
  const missingBaseTechCount = technicians.filter((t) => t.zones.length === 0).length
  const warrantyGap = Boolean(installationWarrantyGap(warrantyOptions))

  const criticalCount =
    (readyContractsCount > 0 ? 1 : 0) +
    (missingBaseTechCount > 0 ? 1 : 0) +
    (openDispatchCount > 3 ? 1 : 0) +
    (warrantyGap ? 1 : 0)

  return (
    <div className="space-y-6">
      <AdminDashboardHeader onRefresh={handleRefreshAll} isRefreshing={isRefreshing} criticalCount={criticalCount} />

      <section aria-labelledby="admin-finance" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="admin-finance" className="text-title font-semibold">
            Tài chính hợp đồng lắp đặt
          </h2>
          <Link to={`${ROUTES.admin.reports}?muc=tai-chinh`} className="ui-link text-meta">
            Báo cáo chi tiết
          </Link>
        </div>
        <PeriodFilter
          from={from}
          to={to}
          today={today}
          error={periodError}
          onChange={(r) => setParams({ tu: r.from, den: r.to })}
          zones={zones}
          zoneId={zoneId}
          onZoneChange={(z) => setParams({ khu: z })}
          zoneNote="Lọc khu vực bỏ qua hợp đồng chưa có dự án thi công; danh sách hợp đồng không lọc theo khu vực nên các link mở danh sách bị ẩn."
        />
        {!periodError && <AdminFinanceSection from={from} to={to} zoneId={zoneId} today={today} />}
      </section>

      <section aria-labelledby="admin-ops" className="space-y-4">
        <h2 id="admin-ops" className="flex items-center gap-2 text-title font-semibold">
          Vận hành <ScopeTag>Hiện tại, mọi khu vực</ScopeTag>
        </h2>
        <AdminDashboardStats
          isLoading={isLoading}
          inProgressProjects={inProgressProjects}
          readyContracts={readyContractsCount}
          openDispatchCount={openDispatchCount}
          pendingServicesCount={pendingServicesCount}
          urgentServicesCount={urgentServicesCount}
          totalTechnicians={technicians.length}
          readyTechnicians={readyTechnicians}
          missingBaseCount={missingBaseTechCount}
          totalUsers={totalUsers}
          zonesCount={zones.length}
        />
        <div className="grid items-start gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ProjectStatusChart
              projects={projects}
              listRoute={ROUTES.admin.installations}
              state={projectsQuery.isPending ? 'loading' : projectsQuery.isError ? 'error' : 'ready'}
              onRetry={() => void projectsQuery.refetch()}
            />
          </div>
          <div className="space-y-4 lg:col-span-5">
            <AdminActionAlertsCard
              isLoading={isLoading}
              readyContractsCount={readyContractsCount}
              missingBaseTechCount={missingBaseTechCount}
              openDispatchCount={openDispatchCount}
              warrantyGap={warrantyGap}
            />
            <section aria-labelledby="admin-catalogs" className="rounded-container bg-surface-2 p-4">
              <h2 id="admin-catalogs" className="mb-3 text-title font-semibold">
                Danh mục quản trị
              </h2>
              <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {[
                  { to: ROUTES.admin.packages, label: 'Gói dịch vụ', note: 'Bảo dưỡng, thiên tai' },
                  { to: ROUTES.admin.warrantyOptions, label: 'Hạn bảo hành', note: 'Lắp đặt, sửa chữa' },
                  { to: ROUTES.admin.zones, label: `Khu vực (${zones.length})`, note: 'Địa bàn, phường xã' },
                  { to: ROUTES.admin.products, label: `Sản phẩm (${totalProducts})`, note: 'Pin, biến tần, vật tư' },
                  { to: ROUTES.admin.reports, label: 'Báo cáo', note: 'Tài chính, thu tiền, sau bán' },
                ].map((item) => (
                  <li key={item.to} className="border-b border-line py-2 last:border-b-0">
                    <Link to={item.to} className="ui-link font-medium">
                      {item.label}
                    </Link>
                    <p className="text-meta text-fg-2">{item.note}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </section>

      <AdminRecentOperationsTable projects={projects} serviceRequests={serviceRequests} dispatchItems={dispatchItems} />
    </div>
  )
}

export default AdminDashboardPage
